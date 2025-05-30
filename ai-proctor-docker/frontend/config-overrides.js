const webpack = require('webpack');

module.exports = function override(config, env) {
    // Temporarily disabling all overrides to isolate issues.

    // Add fallbacks for Node.js core modules
    config.resolve.fallback = {
        ...(config.resolve.fallback || {}),
        "process": require.resolve("process/browser"),
        "stream": require.resolve("stream-browserify"),
        "util": require.resolve("util/"),
        "buffer": require.resolve("buffer/")
    };

    // Alias for process/browser (more specific)
    // config.resolve.alias = {
    //     ...(config.resolve.alias || {}),
    //     'process/browser': require.resolve('process/browser.js'),
    // };

    // Add plugin to provide Node.js globals like Buffer and process
    config.plugins = [
        ...(config.plugins || []),
        new webpack.ProvidePlugin({
            process: 'process/browser',
            Buffer: ['buffer', 'Buffer'],
        }),
    ];

    // Ensure babel-loader processes @mui/base (and other mui packages if necessary)
    // This is to handle modern JS syntax (like ??, ?.) in those packages.
    const babelLoader = config.module.rules.find(
        rule => rule.oneOf && rule.oneOf.find(r => r.loader && r.loader.includes('babel-loader'))
    );

    if (babelLoader) {
        const babelLoaderRule = babelLoader.oneOf.find(r => r.loader && r.loader.includes('babel-loader'));
        if (babelLoaderRule) {
            // Option 1: Modify exclude - If it's a RegExp, it's tricky. If it's a path, easier.
            // For now, let's assume it might be a simple node_modules exclude and try to refine it.
            // A more robust way is to add a new rule or specifically include @mui.
            
            // Let's try a simpler approach: add a new rule to specifically transpile @mui modules
            // This is generally safer than modifying the existing generic node_modules exclude rule.
            const newRule = {
                test: /\.(js|mjs|jsx|ts|tsx)$/,
                include: [
                    /node_modules\/@mui\/base/,
                    /node_modules\/@mui\/material/, // In case other MUI packages also use modern syntax
                    /node_modules\/@mui\/icons-material/,
                    /node_modules\/@mui\/x-date-pickers/
                ],
                loader: babelLoaderRule.loader,
                options: babelLoaderRule.options,
            };
            // Add our new rule before the original babel-loader rule or general file-loader.
            // It needs to be part of the 'oneOf' array.
            babelLoader.oneOf.unshift(newRule);

            // console.log("Modified babel-loader to include @mui packages for transpilation.");
        } else {
            console.warn("Could not find the specific babel-loader rule within oneOf.");
        }
    } else {
        console.warn("Could not find babel-loader in webpack rules.");
    }

    // Ignore warnings
    // config.ignoreWarnings = [
    //     ...(config.ignoreWarnings || []),
    //     function ignoreSourcemapsloaderWarnings(warning) {
    //         return (
    //             warning.module &&
    //             warning.module.resource.includes("node_modules") &&
    //             warning.message.includes("Failed to parse source map")
    //         );
    //     },
    // ];

    return config;
}; 