import { Box, Nav, Button } from 'grommet';
import { Book, Shop, Inbox, ShieldSecurity, Edit } from 'grommet-icons';
import { useState, useRef, JSX, type ReactNode, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { buildApiUrl } from '../../api/apiPath';
import { RootState } from '../../store';

type NavItem = {
  label: ReactNode;
  route: string;
  icon: JSX.Element;
};

const NEW_POST_AGE_MS = 1000 * 60 * 60 * 24 * 7;

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
  const [hasNewBlogPosts, setHasNewBlogPosts] = useState(false);

  const activeRoute = location.pathname;

  useEffect(() => {
    if (typeof fetch !== 'function') {
      return;
    }

    let isMounted = true;

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
        setHasNewBlogPosts(
          posts.some((post: { is_new?: boolean; created_at?: string }) => {
            if (typeof post?.is_new === 'boolean') {
              return post.is_new;
            }

            if (!post?.created_at) {
              return false;
            }

            const timestamp = Date.parse(post.created_at);
            return !Number.isNaN(timestamp) && Date.now() - timestamp <= NEW_POST_AGE_MS;
          })
        );
      })
      .catch(() => {
        if (isMounted) {
          setHasNewBlogPosts(false);
        }
      });

    return () => {
      isMounted = false;
    };
  }, []);

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
                {hasNewBlogPosts && (
                  <Box
                    width="8px"
                    height="8px"
                    round
                    background="status-critical"
                    aria-label="New blog posts available"
                    title="New blog posts available"
                  />
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
