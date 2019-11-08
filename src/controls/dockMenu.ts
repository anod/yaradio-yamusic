import { BrowserWindow, Menu, App } from "electron";
import { menuTemplate, menuSettings } from "./template";

export const register = (win: BrowserWindow, app: App) => {
  const items = menuTemplate(win, app);
  items.push(
    {
        type: "separator"
    },
    menuSettings,
  );
  const dockMenu = Menu.buildFromTemplate(items);

  if (app.dock.setMenu) {
    app.dock.setMenu(dockMenu);
  }
};
