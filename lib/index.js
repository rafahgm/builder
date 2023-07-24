const chokidar = require('chokidar');
const path = require("path");
const { globSync } = require("glob");
const yargs = require('yargs/yargs');
const { mensagemErro, mensagemTempo, mensagemAviso } = require('./utils');
const { readFileSync } = require("fs");
const webpack = require("webpack");
const TerserPlugin = require("terser-webpack-plugin");



function build(arquivo, saida) {
    const caminho = path.resolve(process.cwd(), arquivo);
    const arquivoDestino = path.resolve(path.resolve(process.cwd(), saida), arquivo.replace(/^.+?[\/\\]/, ''))

    const compilador = webpack({
        mode: "development",
        entry: caminho,
        devtool: process.env.NODE_ENV === 'development' ? 'inline-source-map' : false,
        output: {
            path: path.dirname(arquivoDestino),
            filename: path.basename(arquivo)
        },
        target: 'web',
        optimization: {
            minimize: process.env.NODE_ENV === 'production',
            minimizer: [new TerserPlugin({
                terserOptions: {
                    format: {
                        comments: false,
                    },
                },
                extractComments: false,
            })],
        },
        module: {
            rules: [
                {
                    test: /\.(?:js|mjs|cjs)$/,
                    exclude: /node_modules/,
                    use: {
                        loader: 'babel-loader',
                        options: {
                            presets: [
                                ['@babel/preset-env', { targets: "defaults" }]
                            ]
                        }
                    }
                }
            ]
        }
    }, (err, stats) => {
        if (err) {
            console.error(err.stack || err);
            if (err.details) {
                console.log(err.details);
            }
            return;
        }

        const info = stats.toJson();

        if (stats.hasErrors()) {
            info.errors.forEach(err => {
                mensagemErro(err.message + "\n" + err.moduleId);
            })
        }

        if (stats.hasWarnings()) {
            info.warnings.forEach(wrn => {
                mensagemErro(wrn.message + "\n" + wrn.moduleId);
            })
        }

        mensagemTempo(info.time, info.assets[0].name);
    });
}

function builder(args) {
    // Argumentos da linha de comando
    const argv = yargs(args).argv;

    // Lista de arquivos ignorando os _*.js
    const arquivos = globSync(argv.entrada, {
        nodir: true,
        ignore: {
            ignored: p => {
                return p.name.charAt(0) === '_';
            }
        }
    });

    if(process.env.NODE_ENV === 'production') {
        arquivos.forEach(caminho => {
            build(caminho, argv.saida);
        })

        return;
    }

    chokidar.watch(argv.entrada).on('add', (caminho, stats) => {
        const nomeArquivo = path.basename(caminho);
        // Ignora arquivos que começam com _
        if (nomeArquivo[0] === '_') return;

        build(caminho, argv.saida, argv.sourcemap);
    });

    chokidar.watch(argv.entrada).on('change', (caminho, stats) => {
        const nomeArquivo = path.basename(caminho);

        // Ignora arquivos que começam com _
        // TODO: Encontrar todos os arquivos que importam esse arquivo que começa _
        if (nomeArquivo[0] === '_') {
            arquivos.forEach(arquivo => {
                const caminhoImport = path.resolve(process.cwd(), arquivo);
                const conteudo = readFileSync(caminhoImport, 'utf-8');
                if (conteudo.includes(path.basename(caminho, '.js'))) {
                    build(arquivo, argv.saida);
                }
            });
            return;
        };

        build(caminho, argv.saida);
    });
}

module.exports = builder;



