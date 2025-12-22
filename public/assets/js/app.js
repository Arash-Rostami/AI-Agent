document.addEventListener('DOMContentLoaded', async () => {
    const [loginPage, chatPage] = ['login-form', 'messages'].map(id => document.getElementById(id));
    try {
        const {default: ThemeToggle} = await import('./modules/ThemeToggler.js');

        // <=> LOGIN PAGE <=> //
        if (loginPage) {
            const {default: LoginHandler} = await import('./modules/LoginHandler.js');
            new LoginHandler('login-form');
            new ThemeToggle('theme-toggle');
            return;
        }

        // <=> CHAT PAGE <=> //
        if (chatPage) {
            // Instant-loading
            const [{default: ChatHandler}, {default: FontSizeHandler}] =
                await Promise.all([import('./modules/ChatHandler.js'), import('./modules/FontSizeHandler.js')]);
            new ChatHandler();
            new FontSizeHandler();
            new ThemeToggle('theme-toggle');

            // Lazy-loading
            const idle = window.requestIdleCallback || (fn => setTimeout(fn, 500));
            idle(async () => {
                try {
                    const [{default: HistoryHandler}, {default: LogoutHandler}, {default: SyncHandler}, {default: SettingsHandler}, {default: MenuHandler}, {default: PinHandler}] =
                        await Promise.all([
                            import('./modules/HistoryHandler.js'),
                            import('./modules/LogoutHandler.js'),
                            import('./modules/SyncHandler.js'),
                            import('./modules/SettingsHandler.js'),
                            import('./modules/MenuHandler.js'),
                            import('./modules/PinHandler.js')
                        ]);

                    new HistoryHandler();
                    new LogoutHandler('logout-btn');
                    new SyncHandler('sync-btn');
                    new SettingsHandler();
                    new MenuHandler();
                    new PinHandler()
                } catch (e) {
                    console.error('Lazy module load failed:', e);
                }
            }, {timeout: 2000});
        }
    } catch (err) {
        console.error('Module initialization error:', err);
    }
});