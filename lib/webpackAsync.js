const webpack = require("webpack");

/**
 * 
 * @param {Object} configuration
 * @returns 
 */
const webpackAsync = (configuration) => {
    return new Promise((resolve, reject) => {
        webpack(configuration, (err, stats) => {
            if (err) reject(err);
    
            const info = stats.toJson();
    
            if (stats.hasErrors()) reject(info.errors);
            
            let warnings = null;

            if (stats.hasWarnings()) warnings = info.warnings;
            
            resolve({
                warnings: warnings,
                time: info.time,
                name: info.assets[0].name
            });    
        });
    });
}

module.exports =  webpackAsync;