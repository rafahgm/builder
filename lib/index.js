const chokidar = require("chokidar");
const path = require("path");
const {globSync} = require("glob");
const yargs = require("yargs/yargs");
const {mensagemErro, mensagemTempo} = require("./utils");
const {readFileSync} = require("fs");
const TerserPlugin = require("terser-webpack-plugin");
const Bottleneck = require("bottleneck");
const webpackAsync = require("./webpackAsync");

function build(arquivo, saida, modo = 'producao') {
    const caminho = path.resolve(process.cwd(), arquivo);
    const arquivoDestino = path.resolve(
        path.resolve(process.cwd(), saida),
        arquivo.replace(/^.+?[\/\\]/, "")
    );

    return webpackAsync(
        {
            mode: modo === 'producao' ? 'production' : 'development',
            entry: caminho,
            devtool:
                modo === "desenvolvimento" ? "inline-source-map" : false,
            output: {
                path: path.dirname(arquivoDestino),
                filename: path.basename(arquivo)
            },
            target: "web",
            optimization: {
                minimize: process.env.NODE_ENV === "production",
                minimizer: [
                    new TerserPlugin({
                        terserOptions: {
                            format: {
                                comments: false
                            }
                        },
                        extractComments: false
                    })
                ]
            },
            module: {
                rules: [
                    {
                        test: /\.(?:js|mjs|cjs)$/,
                        exclude: /node_modules/,
                        use: {
                            loader: "babel-loader",
                            options: {
                                presets: [["@babel/preset-env", {targets: "defaults"}]]
                            }
                        }
                    },
                    {
                        test: /\.s[ac]ss$/i,
                        use: [
                            // Creates `style` nodes from JS strings
                            "style-loader",
                            // Translates CSS into CommonJS
                            "css-loader",
                            // Compiles Sass to CSS
                            "sass-loader"
                        ]
                    }
                ]
            }
        }
    );
}

function builder(args) {
    // Argumentos da linha de comando
    /**
     * @type {Object} argv
     * @property {string} argv.modo modo de opração do compilador (producao ou desenvolvimento)
     * @property {string} argv.entrada glob de entrada
     * @property {string} argv.saida glob de saida
     */
    const argv = yargs(args).argv;

    let modo = 'producao';

    if (argv.modo) {
        modo = argv.modo;
    } else if (process.env.NODE_ENV) {
        modo = process.env.NODE_ENV;
    }

    const limiter = new Bottleneck({
        maxConcurrent: 3,
        minTime: 100
    });

    // Lista de arquivos ignorando os _*.js
    const arquivos = globSync(argv.entrada, {
        nodir: true,
        ignore: {
            ignored: p => {
                return p.name.charAt(0) === "_";
            }
        }
    });

    if (modo === "producao") {
        arquivos.forEach(caminho => {
            limiter
                .schedule(() => {
                    return build(caminho, argv.saida, modo);
                })
                .then(res => {
                    if (res.warnings) {
                        res.warnings.forEach(wrn => {
                            mensagemErro(wrn.message + "\n" + wrn.moduleId);
                        })
                    }

                    mensagemTempo(res.time, res.name);
                })
                .catch(err => {
                    console.error(err.stack || err);
                    if (err.details) {
                        console.log(err.details);
                    }
                });
        });

        return;
    }

    chokidar.watch(argv.entrada).on("add", (caminho) => {
        const nomeArquivo = path.basename(caminho);
        // Ignora arquivos que começam com _
        if (nomeArquivo[0] === "_") return;

        limiter
            .schedule(() => {
                return build(caminho, argv.saida, modo);
            })
            .then(res => {
                if (res.warnings) {
                    res.warnings.forEach(wrn => {
                        mensagemErro(wrn.message + "\n" + wrn.moduleId);
                    })
                }

                mensagemTempo(res.time, res.name);
            })
            .catch(err => {
                console.error(err.stack || err);
                if (err.details) {
                    console.log(err.details);
                }
            });
    });

    chokidar.watch(argv.entrada).on("change", (caminho) => {
        const nomeArquivo = path.basename(caminho);

        // Ignora arquivos que começam com _
        // TODO: Encontrar todos os arquivos que importam esse arquivo que começa _
        if (nomeArquivo[0] === "_") {
            arquivos.forEach(arquivo => {
                const caminhoImport = path.resolve(process.cwd(), arquivo);
                const conteudo = readFileSync(caminhoImport, "utf-8");
                if (conteudo.includes(path.basename(caminho, ".js"))) {
                    build(arquivo, argv.saida, modo).then(res => {
                        if (res.warnings) {
                            res.warnings.forEach(wrn => {
                                mensagemErro(wrn.message + "\n" + wrn.moduleId);
                            })
                        }

                        mensagemTempo(res.time, res.name);
                    })
                        .catch(err => {
                            console.error(err.stack || err);
                            if (err.details) {
                                console.log(err.details);
                            }
                        });
                }
            });
            return;
        }

        build(caminho, argv.saida, modo).then(res => {
            if (res.warnings) {
                res.warnings.forEach(wrn => {
                    mensagemErro(wrn.message + "\n" + wrn.moduleId);
                })
            }

            mensagemTempo(res.time, res.name);
        })
            .catch(err => {
                console.error(err.stack || err);
                if (err.details) {
                    console.log(err.details);
                }
            });
    });
}

module.exports = builder;
