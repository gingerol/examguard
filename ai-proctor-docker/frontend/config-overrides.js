// const webpack = require('webpack'); // Keep for now, might need later

module.exports = function override(config, env) {
    // Temporarily disabling all overrides to isolate issues.

    // Fallback for process and buffer (still potentially needed by some deps even if axios is fixed otherwise)
    // config.resolve.fallback = {
    //     ...(config.resolve.fallback || {}),
    // "process": require.resolve("process/browser"),
    // "buffer": require.resolve("buffer/")
    // };

    // Alias for process/browser (more specific)
    // config.resolve.alias = {
    //     ...(config.resolve.alias || {}),
    //     'process/browser': require.resolve('process/browser.js'),
    // };

    // ProvidePlugin for process and Buffer (global)
    // config.plugins = (
    //     config.plugins || []
    // ).concat([
    //     new webpack.ProvidePlugin({
    // process: 'process/browser',
    //         Buffer: ['buffer', 'Buffer'],
    //     }),
    // ]);

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