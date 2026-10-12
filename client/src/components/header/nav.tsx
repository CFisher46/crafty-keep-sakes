import { Box, Nav, Button, Text } from 'grommet';
import { useState, type ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { buildApiUrl } from '../../api/apiPath';
import { BLOG_VIEWED_EVENT } from '../../features/blog/events';
import { RootState } from '../../store';
import { ui } from '../../helpers/theme';

type NavItem = {
  label: ReactNode;
  route: string;
};

function NavigationBar({
  onNavigate,
  resetActive,
  vertical = false,
}: {
  onNavigate: (route: string) => void;
  resetActive: () => void;
  vertical?: boolean;
}) {
  const [hovered, setHovered] = useState<string | undefined>();
  const navigate = useNavigate();
  const location = useLocation();

  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userType = useSelector((state: RootState) => state.auth.user?.type);
  const userId = useSelector((state: RootState) => state.auth.user?.id);
  const [unreadBlogCount, setUnreadBlogCount] = useState(0);

  const activeRoute = location.pathname;

  useEffect(() => {
    if (typeof fetch !== 'function') {
      return;
    }

    if (!isLoggedIn) {
      setUnreadBlogCount(0);
      return;
    }

    let isMounted = true;

    const loadUnreadCount = () => {
      fetch(buildApiUrl('blog', '/posts'), { credentials: 'include' })
        .then(async (response) => {
          if (!response.ok) {
            return;
          }

          const payload = await response.json().catch(() => ({ data: [] }));
          if (!isMounted) {
            return;
          }

          const posts = Array.isArray(payload?.data) ? payload.data : [];
          setUnreadBlogCount(
            posts.filter((post: { is_new?: boolean }) => post?.is_new === true).length
          );
        })
        .catch(() => {
          if (isMounted) {
            setUnreadBlogCount(0);
          }
        });
    };

    loadUnreadCount();
    window.addEventListener(BLOG_VIEWED_EVENT, loadUnreadCount);

    return () => {
      isMounted = false;
      window.removeEventListener(BLOG_VIEWED_EVENT, loadUnreadCount);
    };
  }, [isLoggedIn, userId]);

  const items = ([
    { label: 'Shop', route: '/Shop' },
    { label: 'About', route: '/About' },
    {
      label: (
        <Box direction="row" align="center" gap="xsmall">
          <span>Blog</span>
          {unreadBlogCount > 0 && (
            <Box
              background="status-critical"
              round
              pad={{ horizontal: 'xsmall' }}
              align="center"
              justify="center"
              style={{ minWidth: '18px', height: '18px' }}
              aria-label={`${unreadBlogCount} unread blog posts`}
              title={`${unreadBlogCount} unread blog posts`}
            >
              <Text size="xsmall" weight="bold" color="white">
                {unreadBlogCount > 99 ? '99+' : unreadBlogCount}
              </Text>
            </Box>
          )}
        </Box>
      ),
      route: '/Blog',
    },
    { label: 'Contact Us', route: '/Contact' },
    isLoggedIn && userType === 'admin' && { label: 'Admin Tools', route: '/Admin' },
  ] as Array<NavItem | false>).filter((item): item is NavItem => Boolean(item));

  return (
    <Nav
      direction={vertical ? 'column' : 'row'}
      gap={vertical ? 'none' : 'medium'}
      align={vertical ? 'stretch' : 'center'}
    >
      {items.map((item) => {
        const isActive = activeRoute.toLowerCase().startsWith(item.route.toLowerCase());
        const isHovered = hovered === item.route;
        return (
          <Button
            key={item.route}
            plain
            label={item.label}
            onClick={() => {
              onNavigate(item.route);
              navigate(item.route);
              resetActive?.();
            }}
            onMouseEnter={() => setHovered(item.route)}
            onMouseLeave={() => setHovered(undefined)}
            style={{
              padding: vertical ? '14px 4px' : '6px 0',
              fontSize: '12px',
              fontWeight: 600,
              letterSpacing: '0.14em',
              textTransform: 'uppercase',
              color: isActive || isHovered ? ui.ink : ui.muted,
              borderBottom: vertical
                ? `1px solid ${ui.line}`
                : `2px solid ${isActive ? ui.ink : 'transparent'}`,
              transition: 'color 0.2s ease, border-color 0.2s ease',
            }}
          />
        );
      })}
    </Nav>
  );
}

export default NavigationBar;
