import { Box, Nav, Button } from "grommet";
import { Book, Shop, Inbox, ShieldSecurity, Edit } from "grommet-icons";
import { useState, useRef, useEffect, JSX } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { NavigationBarProps } from "../header/types";

function NavigationBar({ onNavigate, resetActive }: NavigationBarProps) {
  const [hovered, setHovered] = useState<string | undefined>();
  const menuRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

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
