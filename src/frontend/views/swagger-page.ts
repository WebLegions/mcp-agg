import type { AppComponent } from '../main';

export const swaggerPage: AppComponent = (_props, _ctx) => {
    return {
        div: {
            style: {
                height: 'calc(100vh - 64px)', // Adjust based on navbar height
                width: '100%',
                display: 'flex',
                flexDirection: 'column',
            },
            children: [
                {
                    iframe: {
                        src: '/swagger', // Assuming swagger UI is served here
                        style: {
                            flex: '1',
                            border: 'none',
                            width: '100%',
                            height: '100%',
                        },
                    },
                },
            ],
        },
    };
};
