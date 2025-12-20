document.addEventListener('DOMContentLoaded', async () => {
    const loginForm = document.getElementById('login-form');
    const chatPage = document.getElementById('messages');

    try {
        //LOGIN PAGE
        if (loginForm) {
            const [{default: LoginHandler}, {default: ThemeToggle}] =
                await Promise.all([import('./modules/LoginHandler.js'), import('./modules/ThemeToggler.js')]);

            new LoginHandler('login-form');
            new ThemeToggle('theme-toggle');
            return;
        }

        //CHAT PAGE
        if (chatPage) {
            // Fast-loading
            const [{default: ChatFacade}, {default: ThemeToggle}, {default: FontSizeHandler}] =
                await Promise.all([import('./modules/ChatFacade.js'), import('./modules/ThemeToggler.js'), import('./modules/FontSizeHandler.js')]);

            new ChatFacade();
            new FontSizeHandler();
            new ThemeToggle('theme-toggle');

            // Lazy-loading
            const idle = window.requestIdleCallback || function (fn) {
                return setTimeout(fn, 500);
            };
            idle(async () => {
                try {
                    const [{default: HistoryHandler}, {default: LogoutHandler}, {default: SyncHandler}] =
                        await Promise.all([import('./modules/HistoryHandler.js'), import('./modules/LogoutHandler.js'), import('./modules/SyncHandler.js')]);

                    new HistoryHandler();
                    new LogoutHandler('logout-btn');
                    new SyncHandler('sync-btn');

                } catch (e) {
                    console.error('Lazy module load failed:', e);
                }
            }, {timeout: 2000});
        }
    } catch (err) {
        console.error('Module initialization error:', err);
    }
});
