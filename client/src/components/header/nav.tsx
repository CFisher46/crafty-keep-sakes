import { Box, Nav, Button, Text } from 'grommet';
import { Book, Shop, Inbox, ShieldSecurity, Edit } from 'grommet-icons';
import { useState, useRef, JSX, type ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { buildApiUrl } from '../../api/apiPath';
import { BLOG_VIEWED_EVENT } from '../../features/blog/events';
import { RootState } from '../../store';

type NavItem = {
  label: ReactNode;
  route: string;
  icon: JSX.Element;
};

function NavigationBar({
  onNavigate,
  resetActive,
}: {
  onNavigate: (route: string) => void;
  resetActive: () => void;
}) {
  const [hovered, setHovered] = useState<string | undefined>();
  const menuRef = useRef<HTMLDivElement>(null);
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

  const SidebarButton = ({
    label,
    route,
    icon,
    ...rest
  }: {
    label: ReactNode;
    route: string;
    icon: JSX.Element;
    [key: string]: any;
  }) => (
    <Button
      {...rest}
      label={label}
      icon={icon}
      size="small"
      plain
      style={{
        padding: '8px 15px',
        textAlign: 'center',
        backgroundColor:
          route === activeRoute
            ? '#fce5f5'
            : hovered === route
              ? '#a5effeff'
              : '',
        borderRadius: '4px',
        transition: 'background-color 0.3s ease',
      }}
      onClick={() => {
        onNavigate(route);
        navigate(route);
        resetActive?.();
      }}
      onMouseEnter={() => setHovered(route)}
      onMouseLeave={() => setHovered(undefined)}
    />
  );

  return (
    <Box
      ref={menuRef}
      width="60%"
      pad="small"
      alignSelf="center"
      margin={{ horizontal: 'auto' }}
    >
      <Nav direction="row" justify="evenly">
        {([
          {
            label: 'Shop',
            route: '/Shop',
            icon: <Shop />,
          },
          {
            label: 'About',
            route: '/About',
            icon: <Edit />,
          },
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
            icon: <Book />,
          },
          isLoggedIn &&
            userType === 'admin' && {
              label: 'Admin Tools',
              route: '/Admin',
              icon: <ShieldSecurity />,
            },
          {
            label: 'Contact Us',
            route: '/Contact',
            icon: <Inbox />,
          },
        ] as Array<NavItem | false>)
          .filter((item): item is NavItem => Boolean(item))
          .map((item) => (
            <SidebarButton
              key={item.route}
              label={item.label}
              route={item.route}
              icon={item.icon}
            />
          ))}
      </Nav>
    </Box>
  );
}

export default NavigationBar;
