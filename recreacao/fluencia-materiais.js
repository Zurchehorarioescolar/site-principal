'use strict';

// Banco autoral de textos, perguntas e palavras para prática de leitura.
const fluenciaMateriais = {
  1: [
    {
      title: 'A mala de Bia',
      passage: 'Bia vai à casa da tia. Ela pega a mala e põe nela uma camisa, um sapato e uma fita. O gato pula na mala. Bia faz carinho no gato. Depois, leva a mala até a porta.',
      questions: [
        'A casa de quem Bia vai visitar?',
        'Qual animal pulou na mala?',
        'O que Bia fez depois de fazer carinho no gato?'
      ],
      words: ['mala', 'mapa', 'sacola', 'fita', 'caneta', 'sapato', 'tapete', 'cabide', 'capa', 'camisa', 'casa', 'livro']
    },
    {
      title: 'A muda de tomate',
      passage: 'Léo põe uma muda de tomate no vaso. Ele rega a muda com uma caneca. De manhã, Léo leva o vaso para o sol. Um dia, ele vê um tomate bem pequeno e chama a mãe para ver.',
      questions: [
        'Onde Léo pôs a muda?',
        'O que Léo usou para regar a muda?',
        'Quem Léo chamou quando viu o tomate pequeno?'
      ],
      words: ['muda', 'vaso', 'tomate', 'rega', 'pote', 'caneca', 'pepino', 'banana', 'batata', 'bota', 'poda', 'planta']
    }
  ],
  2: [
    {
      title: 'O jogo das tampinhas',
      passage: 'Para jogar, separe seis tampinhas e dois potes. Ponha os potes no chão e marque uma linha com fita. Cada jogador fica atrás da linha e tenta jogar três tampinhas, uma de cada vez, no seu pote. Se uma tampinha cair fora, deixe onde caiu até o fim da rodada. Vence quem acertar mais tampinhas.',
      questions: [
        'Quantos potes é preciso separar para o jogo?',
        'Onde cada jogador fica na hora de jogar as tampinhas?',
        'Como os jogadores descobrem quem venceu?'
      ],
      words: ['pote', 'jogo', 'fita', 'jogada', 'rodada', 'linha', 'copo', 'canudo', 'caneca', 'dado', 'lata', 'tampinha']
    },
    {
      title: 'Um recado no portão',
      passage: 'No sábado, Mila achou uma luva azul perto do portão da escola. Ela ia levar a luva para casa, mas a mãe sugeriu deixar um recado no portão. Na segunda, Ravi leu o bilhete e disse que tinha perdido a luva. Para mostrar que era dele, trouxe a outra. As duas tinham o mesmo desenho de foguete.',
      questions: [
        'O que Mila encontrou perto do portão?',
        'Que ideia a mãe de Mila deu?',
        'Como Ravi mostrou que a luva era dele?'
      ],
      words: ['sábado', 'luva', 'recado', 'bilhete', 'desenho', 'foguete', 'janela', 'caneta', 'boné', 'casaco', 'cabide', 'portão']
    }
  ],
  3: [
    {
      title: 'O pião de papel',
      passage: 'Na oficina da escola, Rosa fez um pião com um disco de papelão e um palito. Quando tentou girar, o disco tombou. Uma colega reparou que o furo ficava perto da beirada. Rosa fez outro disco e dobrou o papel ao meio em duas direções. Depois, passou o palito pelo ponto onde as dobras se cruzavam. O novo pião girou por mais tempo. Rosa guardou o primeiro disco para explicar à turma o que tinha mudado.',
      questions: [
        'Quais materiais Rosa usou para fazer o pião?',
        'Como ela encontrou o meio do segundo disco?',
        'Por que Rosa quis guardar o primeiro disco?'
      ],
      words: ['palito', 'colega', 'medida', 'caneta', 'mudado', 'fixado', 'furado', 'desenho', 'gira', 'modelo', 'mágica', 'disco']
    },
    {
      title: 'A feira no ginásio',
      passage: 'A feira de trocas seria no pátio, mas a chuva começou bem na hora da montagem. As crianças levaram caixas de livros e revistas para o ginásio. Quem chegou depois viu o pátio vazio e quase foi embora. Davi percebeu o problema e pediu à equipe da portaria que colocasse um aviso perto da entrada. Logo as mesas ficaram cheias de visitantes. Na reunião do dia seguinte, o grupo decidiu combinar um lugar coberto para o caso de chover de novo.',
      questions: [
        'Por que a feira saiu do pátio?',
        'O que ajudou os visitantes a encontrar o novo local?',
        'Que decisão o grupo tomou para a próxima feira?'
      ],
      words: ['lotado', 'chuva', 'visita', 'aviso', 'mesa', 'chegada', 'jogo', 'recado', 'buzina', 'notado', 'cabana', 'trocas']
    }
  ],
  4: [
    {
      title: 'As marcas da enchente',
      passage: 'Em uma caminhada pelo bairro, a turma viu riscos antigos na parede de uma loja. O dono explicou que cada risco mostrava a altura que a água havia alcançado em um dia de enchente. Ao lado de cada marca, ele escrevia a data. Uma aluna fotografou a parede e comparou os riscos. Percebeu que uma chuva recente tinha deixado a água mais alta do que as outras registradas ali. De volta à escola, a turma fez uma linha do tempo para mostrar as diferenças e preparar perguntas para os moradores.',
      questions: [
        'O que indicava cada risco na parede da loja?',
        'Como a aluna descobriu que a enchente recente tinha sido mais alta?',
        'Para que a turma usou as datas ao voltar à escola?'
      ],
      words: ['caminhada', 'parede', 'loja', 'medida', 'data', 'subida', 'linha', 'moradia', 'enchente', 'comparou', 'diferenças', 'registradas']
    },
    {
      title: 'Uma horta sem torneira',
      passage: 'No terreno da horta comunitária, a torneira mais próxima ficava do outro lado da rua. Para regar as mudas, os voluntários carregavam baldes pesados. Uma moradora propôs guardar a chuva que escorria do telhado do galpão. O grupo instalou uma calha e colocou um reservatório fechado. Depois de uma semana chuvosa, havia água para vários dias de rega. Durante um período seco, porém, o reservatório esvaziou. O grupo resolveu cobrir a terra com folhas secas para conservar a umidade e combinar uma escala para buscar água quando fosse preciso.',
      questions: [
        'Como os voluntários conseguiam água para a horta no começo?',
        'Para onde foi levada a água da chuva que escorria do telhado?',
        'Por que o grupo ainda precisou combinar uma escala para buscar água?'
      ],
      words: ['torneira', 'voluntários', 'calha', 'reservatório', 'chuva', 'telhado', 'pesado', 'moradora', 'fechado', 'rega', 'folhas', 'seco']
    }
  ],
  5: [
    {
      title: 'O banco de sementes',
      passage: 'Em uma feira de sementes, os participantes traziam pequenas porções do que haviam colhido. Cada pacote vinha com o nome da planta e uma nota sobre a época de semear. Uma família ofereceu sementes de feijão que plantava havia muitos anos. Outra levou um milho que crescia bem mesmo com pouca chuva. Na mesa de cadastro, uma estudante anotou de quem vinha cada pacote e guardou parte das sementes em um armário seco. A ideia era ter uma reserva se alguma colheita se perdesse. Na feira seguinte, quem tivesse cultivado as sementes poderia trazer uma parte de volta.',
      questions: [
        'Quais informações acompanhavam os pacotes de sementes?',
        'Por que uma parte das sementes foi guardada?',
        'Como os participantes podiam contribuir para renovar a reserva na feira seguinte?'
      ],
      words: ['colhido', 'pacote', 'pequena', 'roçado', 'batata', 'milho', 'mesa', 'legume', 'sementes', 'porções', 'cadastro', 'reserva']
    },
    {
      title: 'A rota do ônibus',
      passage: 'O jornal da escola publicou o desenho de uma nova rota de ônibus. No papel, a parada parecia perto da quadra esportiva. Ao refazer o caminho a pé, Joana encontrou um muro comprido e precisou contornar o quarteirão. O trajeto levou quinze minutos. Ela voltou com um colega, que percebeu uma passagem aberta ao lado da padaria. Por ali, os dois chegaram em sete minutos. Na edição seguinte, a equipe acrescentou ao desenho os caminhos de pedestres e o tempo aproximado de cada percurso. Assim, quem lesse o jornal poderia escolher o caminho sabendo por onde era possível passar.',
      questions: [
        'O que fez Joana demorar no primeiro trajeto?',
        'Como Joana e o colega chegaram mais rápido na segunda vez?',
        'Por que as novas informações tornaram o desenho mais útil para quem vai a pé?'
      ],
      words: ['desenho', 'parada', 'caminho', 'colega', 'mudava', 'demora', 'mapa', 'rodava', 'quarteirão', 'pedestres', 'aproximado', 'percurso']
    }
  ],
  6: [
    {
      title: 'O varal de histórias',
      passage: 'Na primeira semana de aula, uma turma pendurou no corredor relatos escritos por moradores do bairro. A ideia era montar uma exposição, mas logo apareceram bilhetes de visitantes com novas lembranças. Uma funcionária contou que o terreno da escola já fora um campo de futebol. Um estudante desenhou o campo com base no relato e anexou o desenho ao varal. No fim do mês, o grupo decidiu guardar os bilhetes junto dos textos. Segundo a professora, a exposição tinha virado uma conversa: cada visitante podia acrescentar algo que os autores iniciais desconheciam. As histórias seguiram para a biblioteca, onde ficaram disponíveis para outras turmas.',
      questions: [
        'De quem eram os relatos pendurados na primeira semana?',
        'Como o relato da funcionária foi incorporado ao varal?',
        'Por que a professora disse que a exposição tinha virado uma conversa?'
      ],
      words: ['corredor', 'relatos', 'moradores', 'exposição', 'lembranças', 'funcionária', 'terreno', 'desenho', 'acrescentar', 'desconheciam', 'biblioteca', 'disponíveis']
    },
    {
      title: 'O relógio da praça',
      passage: 'O relógio da praça parou às quatro e dez. Na manhã seguinte, três pessoas esperaram o ônibus debaixo dele. A primeira consultou o celular e percebeu que ainda era cedo. A segunda, que sempre acertava os minutos pelo relógio da praça, achou que já tinha perdido a condução. A terceira olhou para os ponteiros, sorriu e contou que aquele era o horário em que costumava tomar café com o avô. Naquele dia, o mesmo relógio serviu de enfeite, de aviso equivocado e de lembrança. Quando o conserto terminou, a terceira pessoa tirou uma foto dos ponteiros antes que voltassem a andar.',
      questions: [
        'A que horas o relógio da praça parou?',
        'Por que a segunda pessoa achou que tinha perdido o ônibus?',
        'O que explica a vontade da terceira pessoa de fotografar os ponteiros?'
      ],
      words: ['relógio', 'consultou', 'percebeu', 'condução', 'ponteiros', 'costumava', 'enfeite', 'equivocado', 'lembrança', 'conserto', 'terminou', 'voltassem']
    }
  ],
  7: [
    {
      title: 'O solo que bebe chuva',
      passage: 'Depois de uma tempestade, a turma comparou dois pontos do pátio. Sobre o cimento, a água formou poças. Na faixa coberta de plantas, boa parte da chuva desapareceu da superfície em poucos minutos. Para entender a diferença, os alunos colocaram terra e pedrinhas em um recipiente com furos. Quando despejaram água, ela atravessou os espaços entre os grãos e saiu pelo fundo. A professora explicou que, em um jardim, esse movimento ajuda a diminuir o volume que escorre pelas calçadas. A experiência também mostrou que um solo já encharcado absorve água mais devagar. Por isso, a área verde ajuda, mas ainda pode formar poças durante chuvas fortes.',
      questions: [
        'Que diferença a turma observou entre o cimento e a faixa com plantas?',
        'O que o recipiente com furos ajudou a explicar?',
        'Por que ainda pode haver poças em uma área verde?'
      ],
      words: ['tempestade', 'comparou', 'superfície', 'diferença', 'recipiente', 'despejaram', 'atravessou', 'movimento', 'calçadas', 'experiência', 'encharcado', 'absorve']
    },
    {
      title: 'O mapa dos ruídos',
      passage: 'Para descobrir onde era mais fácil conversar na escola, o grêmio fez um mapa dos ruídos. Durante uma semana, os estudantes anotaram o que ouviam no mesmo horário em quatro locais. Perto do portão, o trânsito encobria as falas. No pátio, o barulho aumentava quando duas turmas saíam juntas. Já na biblioteca, a janela aberta deixava entrar o som da rua, mas as estantes ajudavam a conter os ruídos vindos do corredor. O grupo sugeriu escalonar as saídas para o recreio e testou a proposta por dois dias. As anotações mostraram menos momentos de barulho intenso no pátio, embora o trânsito perto do portão continuasse igual.',
      questions: [
        'Como o grêmio coletou as informações para montar o mapa?',
        'Que observação motivou a ideia de organizar as saídas para o recreio em horários diferentes?',
        'Por que a proposta teve um efeito no pátio e o barulho do portão continuou igual?'
      ],
      words: ['ruídos', 'grêmio', 'estudantes', 'trânsito', 'encobria', 'biblioteca', 'estantes', 'corredor', 'escalonar', 'proposta', 'anotações', 'intenso']
    }
  ],
  8: [
    {
      title: 'A legenda mudou a notícia',
      passage: 'A equipe do jornal da escola recebeu uma fotografia de um banco quebrado. A primeira legenda dizia que moradores haviam danificado o banco durante uma festa. Antes de publicar, uma repórter conferiu a data da imagem e entrevistou a zeladora da praça. Descobriu que a madeira já estava solta na véspera do evento e que a equipe de manutenção havia isolado o local. A notícia saiu com outra legenda, que descrevia o estado do banco e citava o pedido de reparo registrado pela zeladora. A fotografia continuou a mesma. A apuração mudou o que o jornal podia afirmar e evitou que uma suspeita ganhasse aparência de fato.',
      questions: [
        'O que a primeira legenda atribuía aos moradores?',
        'Que informações a repórter encontrou ao conferir a imagem e entrevistar a zeladora?',
        'Por que a legenda alterou o sentido da fotografia para quem leu a notícia?'
      ],
      words: ['legenda', 'fotografia', 'danificado', 'repórter', 'entrevistou', 'véspera', 'manutenção', 'descrevia', 'registrado', 'apuração', 'suspeita', 'aparência']
    },
    {
      title: 'Como medir a sombra',
      passage: 'Duas turmas queriam comparar a sombra de uma árvore com a de uma cobertura de metal. A primeira mediu o comprimento das sombras no chão ao meio-dia e concluiu que a cobertura protegia uma área maior. A segunda observou os mesmos lugares em três horários e registrou também a temperatura dos bancos. Seus dados mostraram que, no fim da tarde, a sombra da árvore alcançava mais assentos e os bancos ali estavam mais frescos. Os resultados pareciam incompatíveis até que as turmas compararam seus métodos. Uma investigação respondia sobre a extensão da sombra em certo horário. A outra também procurava entender as condições para permanecer no lugar ao longo do dia.',
      questions: [
        'Que medida a primeira turma usou para comparar a árvore e a cobertura?',
        'Quais informações a segunda turma acrescentou à comparação?',
        'Por que os resultados podiam ser diferentes mesmo quando as turmas observaram os mesmos lugares?'
      ],
      words: ['comprimento', 'cobertura', 'concluiu', 'registrou', 'temperatura', 'alcançava', 'resultados', 'incompatíveis', 'métodos', 'investigação', 'extensão', 'permanecer']
    }
  ],
  9: [
    {
      title: 'Quem cabe no horário?',
      passage: 'A biblioteca do bairro propôs fechar uma hora mais cedo, pois o número de empréstimos no fim do dia era baixo. Uma leitora pediu que a decisão considerasse também quem usava o espaço para estudar. Muitos desses frequentadores chegavam depois do trabalho e saíam sem pegar livros. A equipe passou a registrar, durante duas semanas, quantas pessoas ocupavam as mesas em cada horário. O levantamento revelou movimento justamente no período que poderia ser cortado. A biblioteca decidiu manter duas noites de atendimento ampliado e revisar a medida depois de um mês. Contar empréstimos era adequado para saber quantos livros circulavam. Para entender a procura pelo espaço, foi preciso observar outro tipo de uso.',
      questions: [
        'Em que dado se baseava a proposta inicial de reduzir o horário?',
        'Que grupo aparecia pouco nesse indicador e por quê?',
        'Por que a mudança no que era observado levou a outra decisão?'
      ],
      words: ['biblioteca', 'empréstimos', 'considerasse', 'frequentadores', 'registrar', 'ocupavam', 'levantamento', 'justamente', 'atendimento', 'ampliado', 'adequado', 'circulavam']
    },
    {
      title: 'Antes de compartilhar',
      passage: 'Uma imagem compartilhada em um grupo de mensagens afirmava que o terminal do bairro ficaria fechado no sábado. O aviso parecia oficial, mas não trazia data de publicação. Ao pesquisar a imagem, um estudante encontrou a postagem original: ela informava sobre uma reforma concluída no ano anterior. Algumas pessoas queriam reenviar a imagem com uma correção abaixo. Outras preferiram divulgar apenas o comunicado atualizado. Para defender essa segunda opção, o estudante lembrou que, ao encaminhar uma mensagem, alguém pode separar a fotografia do texto que a acompanha. O grupo publicou o horário atual e explicou por que o aviso antigo voltara a circular. Assim, quem recebesse a informação poderia verificar sua origem.',
      questions: [
        'Como o estudante descobriu que o aviso se referia ao ano anterior?',
        'Qual era o risco de divulgar a fotografia antiga junto de uma correção?',
        'Que diferença a explicação sobre a origem do aviso fazia para quem recebesse a nova mensagem?'
      ],
      words: ['compartilhada', 'terminal', 'publicação', 'postagem', 'concluída', 'correção', 'comunicado', 'atualizado', 'encaminhar', 'fotografia', 'circular', 'verificar']
    }
  ]
};
