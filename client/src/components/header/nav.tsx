import { Box, Nav, Button } from "grommet";
import { Book, Shop, Inbox, ShieldSecurity, Edit } from "grommet-icons";
import { useState, useRef, JSX, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";
import { useAppDispatch } from "../../store/hooks";
import { fetchUserById } from "../../store/users/usersThunks";
// import { buttonStyles } from '../../../helpers/styles';

function NavigationBar({
  onNavigate,
  resetActive
}: {
  onNavigate: (route: string) => void;
  resetActive: () => void;
}) {
  const [hovered, setHovered] = useState<string | undefined>();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const location = useLocation();
  const isLoggedIn = useSelector((state: RootState) => state.users.isLoggedIn);

  const activeRoute = location.pathname;
  const userId = useSelector((state: RootState) => state.auth.user?.id);

  useEffect(() => {
    if (isLoggedIn && userId) {
      dispatch(fetchUserById(userId));
    }
  }, [isLoggedIn, userId, dispatch]);

  const userType = useSelector(
    (state: RootState) => state.users.selectedUser?.type
  );

  const SidebarButton = ({
    label,
    route,
    icon,
    ...rest
  }: {
    label: string;
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
        padding: "8px 15px",
        textAlign: "center",
        backgroundColor: route === activeRoute ? "#D3D3D3" : "",
        borderRadius: "4px"
      }}
      onClick={() => {
        onNavigate(route);
        navigate(route);
      }}
      onMouseEnter={() => setHovered(label)}
      onMouseLeave={() => setHovered(undefined)}
    />
  );

  return (
    <Box
      ref={menuRef}
      width="60%"
      pad="small"
      alignSelf="center"
      margin={{ horizontal: "auto" }}
    >
      <Nav direction="row" justify="evenly">
        {[
          {
            label: "Shop",
            route: "/Shop",
            icon: <Shop />
          },
          {
            label: "About",
            route: "/About",
            icon: <Edit />
          },
          {
            label: "Blog",
            route: "/Blog",
            icon: <Book />
          },
          userType === "admin" && {
            label: "Admin Tools",
            route: "/Admin",
            icon: <ShieldSecurity />
          },
          {
            label: "Contact Us",
            route: "/Contact",
            icon: <Inbox />
          }
        ]
          .filter(
            (
              item
            ): item is {
              label: string;
              route: string;
              icon: JSX.Element;
            } => Boolean(item)
          )
          .map((item) => (
            <SidebarButton
              key={item.label}
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
