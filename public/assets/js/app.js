document.addEventListener('DOMContentLoaded', async () => {

    // LOGIN PAGE
    if (document.getElementById('login-form')) {
        const {default: LoginHandler} = await import('./modules/LoginHandler.js');
        const {default: ThemeToggle} = await import('./modules/ThemeToggler.js');

        new LoginHandler('login-form');
        new ThemeToggle('theme-toggle');
        return;
    }

    // CHAT PAGE
    if (document.getElementById('messages')) {
        const {default: ChatFacade} = await import('./modules/ChatFacade.js');
        const {default: HistoryHandler} = await import('./modules/HistoryHandler.js');
        const {default: LogoutHandler} = await import('./modules/LogoutHandler.js');
        const {default: SyncHandler} = await import('./modules/SyncHandler.js');
        const {default: FontSizeHandler} = await import('./modules/FontSizeHandler.js');
        const {default: ThemeToggle} = await import('./modules/ThemeToggler.js');

        new ChatFacade();
        new HistoryHandler();
        new LogoutHandler('logout-btn');
        new SyncHandler('sync-btn');
        new FontSizeHandler();
        new ThemeToggle('theme-toggle');
    }
});
