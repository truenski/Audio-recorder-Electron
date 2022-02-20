const { app, BrowserWindow, ipcMain, Menu, shell, dialog } = require('electron')
const path = require('path');
const os = require('os');
const fs = require('fs');
const Store = require('./store');
const preferences = new Store({
    configName: 'user-preferences',
    defaults: {
        destination: path.join(os.homedir(), 'audios')
    }
});

let destination = preferences.get("destination");

const isDev = process.env.NODE_ENV !== undefined && process.env.NODE_ENV === "development" ?
    true : false;
const isMac = process.platform === 'darwin' ? true : false;

const createPreferenceWindow = () => {
    const preferenceWindow = new BrowserWindow({
        width: isDev ? 950 : 500,
        height: 150,
        resizable: isDev ? true : false,
        show: false,
        backgroundColor: "#234",

        //pick another icon!!
        icon: path.join(__dirname, 'assets/icons/folder.png'),

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });

    preferenceWindow.loadFile('./src/preferences/index.html');

    preferenceWindow.once('ready-to-show', () => {
        preferenceWindow.show();
        if (isDev) {
            preferenceWindow.webContents.openDevTools();
        }
        preferenceWindow.webContents.send("dest-path-update", destination)
    });
}

const createWindow = () => {
    const win = new BrowserWindow({
        width: isDev ? 950 : 500,
        height: 300,
        resizable: isDev ? true : false,
        show: false,
        backgroundColor: "#234",
        icon: path.join(__dirname, 'assets/icons/record.ico'),

        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
        },
    });


    win.loadFile('./src/mainWindow/index.html');
    if (isDev) {
        win.webContents.openDevTools();
    }

    win.once('ready-to-show', () => {
        win.show();

        const menuTemplate = [{
            label: app.name,
            submenu: [{
                label: "Preferences",
                accelerator: 'CmdOrCtrl+p',
                click: () => {
                    createPreferenceWindow()
                }
            }, { type: 'separator' }, {
                label: 'Open destination',
                accelerator: 'CmdOrCtrl+o',
                click: () => {
                    shell.openPath(destination)
                }
            }],
        }, {
            label: 'File',
            submenu: [
                isMac ? {
                    role: "close",
                    accelerator: 'CmdOrCtrl+e'
                } : {
                    role: "quit",
                    accelerator: 'CmdOrCtrl+e'
                }
            ]
        }];
        const menu = Menu.buildFromTemplate(menuTemplate);
        Menu.setApplicationMenu(menu);

    });
}



app.whenReady().then(() => {
    createWindow();
})



app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
});



//Receive buffer
ipcMain.on("save_buffer", (e, buffer) => {
    const filePath = path.join(destination, `${Date.now()}`)
    fs.writeFileSync(`${filePath}.webm`, buffer)
})


ipcMain.handle("show-dialog", async(event) => {
    const result = await dialog.showOpenDialog({ properties: ['openDirectory'] })
    const dirPath = result.filePaths[0]
    preferences.set("destination", dirPath)
    destination = preferences.get("destination")
    return destination
})


//Function to rename .webmfiles
//....