import { Box, Nav, Button } from "grommet";
import { Book, Shop, Inbox, ShieldSecurity, Edit } from "grommet-icons";
import { useState, useRef, JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { RootState } from "../../store";

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
  const location = useLocation();

  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const userType = useSelector(
    (state: RootState) => state.users.selectedUser?.type
  );

  const activeRoute = location.pathname;

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
        backgroundColor: route === activeRoute ? "#fce5f5" : "",
        borderRadius: "4px"
      }}
      onClick={() => {
        onNavigate(route);
        navigate(route);
        resetActive?.();
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
          isLoggedIn &&
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
