const log = require('fancy-log');
const chalk = require("chalk");

function mensagemTempo(tempo, mensagem){

    let tempoSegundos = (tempo/ 1000).toFixed(3) + 's';
    let mensagemTempo = chalk.green(tempoSegundos);

    if(tempo >= 1000 && tempo <= 3000) {
        mensagemTempo = chalk.yellow(tempoSegundos);
    }else if(tempo > 3000) {
        mensagemTempo = chalk.red(tempoSegundos);
    }

    log(`${mensagemTempo} - ${mensagem}`);
}

function mensagemErro(mensagem) {
    log(chalk.white(chalk.bgRed(mensagem)));
}

function mensagemAviso(mensagem){
    log(chalk.black(chalk.bgYellow(mensagem)));
}

module.exports = {
    mensagemTempo,
    mensagemErro,
    mensagemAviso
}