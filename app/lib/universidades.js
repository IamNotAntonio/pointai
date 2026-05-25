// Curated list of Brazilian higher-education institutions.
// Source: distilled from MEC/INEP records + common variants.
// Matching is case- and accent-insensitive via normalize().

export const UNIVERSIDADES = [
  // ── Federais ────────────────────────────────────────────────
  { sigla: 'UFRJ',     nome: 'Universidade Federal do Rio de Janeiro' },
  { sigla: 'UFRGS',    nome: 'Universidade Federal do Rio Grande do Sul' },
  { sigla: 'UFMG',     nome: 'Universidade Federal de Minas Gerais' },
  { sigla: 'UFPR',     nome: 'Universidade Federal do Paraná' },
  { sigla: 'UFSC',     nome: 'Universidade Federal de Santa Catarina' },
  { sigla: 'UFBA',     nome: 'Universidade Federal da Bahia' },
  { sigla: 'UFC',      nome: 'Universidade Federal do Ceará' },
  { sigla: 'UFPE',     nome: 'Universidade Federal de Pernambuco' },
  { sigla: 'UFPA',     nome: 'Universidade Federal do Pará' },
  { sigla: 'UFAM',     nome: 'Universidade Federal do Amazonas' },
  { sigla: 'UFRN',     nome: 'Universidade Federal do Rio Grande do Norte' },
  { sigla: 'UFES',     nome: 'Universidade Federal do Espírito Santo' },
  { sigla: 'UFU',      nome: 'Universidade Federal de Uberlândia' },
  { sigla: 'UFG',      nome: 'Universidade Federal de Goiás' },
  { sigla: 'UFMA',     nome: 'Universidade Federal do Maranhão' },
  { sigla: 'UFPB',     nome: 'Universidade Federal da Paraíba' },
  { sigla: 'UFV',      nome: 'Universidade Federal de Viçosa' },
  { sigla: 'UFLA',     nome: 'Universidade Federal de Lavras' },
  { sigla: 'UFOP',     nome: 'Universidade Federal de Ouro Preto' },
  { sigla: 'UFSM',     nome: 'Universidade Federal de Santa Maria' },
  { sigla: 'UFCG',     nome: 'Universidade Federal de Campina Grande' },
  { sigla: 'UFRPE',    nome: 'Universidade Federal Rural de Pernambuco' },
  { sigla: 'UFRA',     nome: 'Universidade Federal Rural da Amazônia' },
  { sigla: 'UFRR',     nome: 'Universidade Federal de Roraima' },
  { sigla: 'UFAC',     nome: 'Universidade Federal do Acre' },
  { sigla: 'UFAL',     nome: 'Universidade Federal de Alagoas' },
  { sigla: 'UNIFAP',   nome: 'Universidade Federal do Amapá' },
  { sigla: 'UFCA',     nome: 'Universidade Federal do Cariri' },
  { sigla: 'UFFS',     nome: 'Universidade Federal da Fronteira Sul' },
  { sigla: 'UFGD',     nome: 'Universidade Federal da Grande Dourados' },
  { sigla: 'UFJF',     nome: 'Universidade Federal de Juiz de Fora' },
  { sigla: 'UFMS',     nome: 'Universidade Federal do Mato Grosso do Sul' },
  { sigla: 'UFMT',     nome: 'Universidade Federal de Mato Grosso' },
  { sigla: 'UFPI',     nome: 'Universidade Federal do Piauí' },
  { sigla: 'UFRRJ',    nome: 'Universidade Federal Rural do Rio de Janeiro' },
  { sigla: 'UFS',      nome: 'Universidade Federal de Sergipe' },
  { sigla: 'UFSCar',   nome: 'Universidade Federal de São Carlos' },
  { sigla: 'UFSJ',     nome: 'Universidade Federal de São João del-Rei' },
  { sigla: 'UFT',      nome: 'Universidade Federal do Tocantins' },
  { sigla: 'UFTM',     nome: 'Universidade Federal do Triângulo Mineiro' },
  { sigla: 'UFVJM',    nome: 'Universidade Federal dos Vales do Jequitinhonha e Mucuri' },
  { sigla: 'UFOB',     nome: 'Universidade Federal do Oeste da Bahia' },
  { sigla: 'UFOPA',    nome: 'Universidade Federal do Oeste do Pará' },
  { sigla: 'UFCSPA',   nome: 'Universidade Federal de Ciências da Saúde de Porto Alegre' },
  { sigla: 'UFERSA',   nome: 'Universidade Federal Rural do Semi-Árido' },
  { sigla: 'UFF',      nome: 'Universidade Federal Fluminense' },
  { sigla: 'UnB',      nome: 'Universidade de Brasília' },
  { sigla: 'UFRB',     nome: 'Universidade Federal do Recôncavo da Bahia' },
  { sigla: 'UNILA',    nome: 'Universidade Federal da Integração Latino-Americana' },
  { sigla: 'UNILAB',   nome: 'Universidade da Integração Internacional da Lusofonia Afro-Brasileira' },
  { sigla: 'UNIFAL',   nome: 'Universidade Federal de Alfenas' },
  { sigla: 'UNIFEI',   nome: 'Universidade Federal de Itajubá' },
  { sigla: 'UNIRIO',   nome: 'Universidade Federal do Estado do Rio de Janeiro' },
  { sigla: 'UTFPR',    nome: 'Universidade Tecnológica Federal do Paraná' },
  { sigla: 'UFABC',    nome: 'Universidade Federal do ABC' },
  { sigla: 'UFSB',     nome: 'Universidade Federal do Sul da Bahia' },
  { sigla: 'UNIFESP',  nome: 'Universidade Federal de São Paulo' },
  { sigla: 'UNIFESSPA', nome: 'Universidade Federal do Sul e Sudeste do Pará' },

  // ── Estaduais ──────────────────────────────────────────────
  { sigla: 'USP',      nome: 'Universidade de São Paulo' },
  { sigla: 'UNICAMP',  nome: 'Universidade Estadual de Campinas' },
  { sigla: 'UNESP',    nome: 'Universidade Estadual Paulista Júlio de Mesquita Filho' },
  { sigla: 'UERJ',     nome: 'Universidade do Estado do Rio de Janeiro' },
  { sigla: 'UEFS',     nome: 'Universidade Estadual de Feira de Santana' },
  { sigla: 'UEM',      nome: 'Universidade Estadual de Maringá' },
  { sigla: 'UEPG',     nome: 'Universidade Estadual de Ponta Grossa' },
  { sigla: 'UEPB',     nome: 'Universidade Estadual da Paraíba' },
  { sigla: 'UENF',     nome: 'Universidade Estadual do Norte Fluminense Darcy Ribeiro' },
  { sigla: 'UESPI',    nome: 'Universidade Estadual do Piauí' },
  { sigla: 'UESC',     nome: 'Universidade Estadual de Santa Cruz' },
  { sigla: 'UESB',     nome: 'Universidade Estadual do Sudoeste da Bahia' },
  { sigla: 'UEMA',     nome: 'Universidade Estadual do Maranhão' },
  { sigla: 'UEMS',     nome: 'Universidade Estadual de Mato Grosso do Sul' },
  { sigla: 'UEMG',     nome: 'Universidade do Estado de Minas Gerais' },
  { sigla: 'UEA',      nome: 'Universidade do Estado do Amazonas' },
  { sigla: 'UECE',     nome: 'Universidade Estadual do Ceará' },
  { sigla: 'UEL',      nome: 'Universidade Estadual de Londrina' },
  { sigla: 'UENP',     nome: 'Universidade Estadual do Norte do Paraná' },
  { sigla: 'UPE',      nome: 'Universidade de Pernambuco' },
  { sigla: 'UDESC',    nome: 'Universidade do Estado de Santa Catarina' },
  { sigla: 'UVA-CE',   nome: 'Universidade Estadual Vale do Acaraú' },
  { sigla: 'UEAP',     nome: 'Universidade do Estado do Amapá' },
  { sigla: 'USCS',     nome: 'Universidade Municipal de São Caetano do Sul' },

  // ── Militares e tecnológicas ──────────────────────────────
  { sigla: 'ITA',      nome: 'Instituto Tecnológico de Aeronáutica' },
  { sigla: 'IME',      nome: 'Instituto Militar de Engenharia' },
  { sigla: 'AMAN',     nome: 'Academia Militar das Agulhas Negras' },
  { sigla: 'EN',       nome: 'Escola Naval' },
  { sigla: 'AFA',      nome: 'Academia da Força Aérea' },
  { sigla: 'CEFET-MG', nome: 'Centro Federal de Educação Tecnológica de Minas Gerais' },
  { sigla: 'CEFET-RJ', nome: 'Centro Federal de Educação Tecnológica Celso Suckow da Fonseca' },

  // ── Institutos Federais ───────────────────────────────────
  { sigla: 'IFSP',     nome: 'Instituto Federal de São Paulo' },
  { sigla: 'IFRJ',     nome: 'Instituto Federal do Rio de Janeiro' },
  { sigla: 'IFMG',     nome: 'Instituto Federal de Minas Gerais' },
  { sigla: 'IFPR',     nome: 'Instituto Federal do Paraná' },
  { sigla: 'IFSC',     nome: 'Instituto Federal de Santa Catarina' },
  { sigla: 'IFBA',     nome: 'Instituto Federal da Bahia' },
  { sigla: 'IFCE',     nome: 'Instituto Federal do Ceará' },
  { sigla: 'IFPE',     nome: 'Instituto Federal de Pernambuco' },
  { sigla: 'IFPA',     nome: 'Instituto Federal do Pará' },
  { sigla: 'IFRN',     nome: 'Instituto Federal do Rio Grande do Norte' },
  { sigla: 'IFES',     nome: 'Instituto Federal do Espírito Santo' },
  { sigla: 'IFG',      nome: 'Instituto Federal de Goiás' },
  { sigla: 'IFRS',     nome: 'Instituto Federal do Rio Grande do Sul' },
  { sigla: 'IFB',      nome: 'Instituto Federal de Brasília' },
  { sigla: 'IFAM',     nome: 'Instituto Federal do Amazonas' },
  { sigla: 'IFRR',     nome: 'Instituto Federal de Roraima' },
  { sigla: 'IFAP',     nome: 'Instituto Federal do Amapá' },
  { sigla: 'IFTM',     nome: 'Instituto Federal do Triângulo Mineiro' },
  { sigla: 'IFTO',     nome: 'Instituto Federal do Tocantins' },
  { sigla: 'IFAC',     nome: 'Instituto Federal do Acre' },
  { sigla: 'IFMA',     nome: 'Instituto Federal do Maranhão' },
  { sigla: 'IFPI',     nome: 'Instituto Federal do Piauí' },
  { sigla: 'IFPB',     nome: 'Instituto Federal da Paraíba' },
  { sigla: 'IFAL',     nome: 'Instituto Federal de Alagoas' },
  { sigla: 'IFS',      nome: 'Instituto Federal de Sergipe' },

  // ── FATEC / ETEC ──────────────────────────────────────────
  { sigla: 'FATEC',    nome: 'Faculdade de Tecnologia do Estado de São Paulo' },
  { sigla: 'ETEC',     nome: 'Escola Técnica Estadual de São Paulo' },

  // ── PUCs ─────────────────────────────────────────────────
  { sigla: 'PUC-SP',   nome: 'Pontifícia Universidade Católica de São Paulo' },
  { sigla: 'PUC-Rio',  nome: 'Pontifícia Universidade Católica do Rio de Janeiro' },
  { sigla: 'PUC Minas', nome: 'Pontifícia Universidade Católica de Minas Gerais' },
  { sigla: 'PUCRS',    nome: 'Pontifícia Universidade Católica do Rio Grande do Sul' },
  { sigla: 'PUCPR',    nome: 'Pontifícia Universidade Católica do Paraná' },
  { sigla: 'PUC-Campinas', nome: 'Pontifícia Universidade Católica de Campinas' },
  { sigla: 'PUC-Goiás', nome: 'Pontifícia Universidade Católica de Goiás' },

  // ── Privadas de elite e business ──────────────────────────
  { sigla: 'Mackenzie', nome: 'Universidade Presbiteriana Mackenzie' },
  { sigla: 'FGV',      nome: 'Fundação Getulio Vargas' },
  { sigla: 'INSPER',   nome: 'Insper Instituto de Ensino e Pesquisa' },
  { sigla: 'IBMEC',    nome: 'IBMEC — Instituto Brasileiro de Mercado de Capitais' },
  { sigla: 'FAAP',     nome: 'Fundação Armando Alvares Penteado' },
  { sigla: 'ESPM',     nome: 'Escola Superior de Propaganda e Marketing' },
  { sigla: 'FEI',      nome: 'Centro Universitário FEI' },
  { sigla: 'FIA',      nome: 'Fundação Instituto de Administração' },
  { sigla: 'FECAP',    nome: 'Fundação Escola de Comércio Álvares Penteado' },
  { sigla: 'Belas Artes', nome: 'Universidade Belas Artes de São Paulo' },
  { sigla: 'Trevisan', nome: 'Trevisan Escola de Negócios' },

  // ── Faculdades de medicina e ciências da saúde ───────────
  { sigla: 'FCMSCSP',  nome: 'Faculdade de Ciências Médicas da Santa Casa de São Paulo' },
  { sigla: 'EBMSP',    nome: 'Escola Bahiana de Medicina e Saúde Pública' },
  { sigla: 'FCM-MG',   nome: 'Faculdade de Ciências Médicas de Minas Gerais' },
  { sigla: 'EMESCAM',  nome: 'Escola Superior de Ciências da Misericórdia de Vitória' },
  { sigla: 'FMABC',    nome: 'Faculdade de Medicina do ABC' },
  { sigla: 'UNIFENAS', nome: 'Universidade José do Rosário Vellano' },

  // ── Universidades Católicas e confessionais ──────────────
  { sigla: 'UCB',      nome: 'Universidade Católica de Brasília' },
  { sigla: 'UCS',      nome: 'Universidade de Caxias do Sul' },
  { sigla: 'UCSAL',    nome: 'Universidade Católica do Salvador' },
  { sigla: 'UNICAP',   nome: 'Universidade Católica de Pernambuco' },
  { sigla: 'UNISINOS', nome: 'Universidade do Vale do Rio dos Sinos' },
  { sigla: 'UMESP',    nome: 'Universidade Metodista de São Paulo' },
  { sigla: 'UNIMEP',   nome: 'Universidade Metodista de Piracicaba' },
  { sigla: 'USF',      nome: 'Universidade São Francisco' },

  // ── Privadas grandes (rede) ──────────────────────────────
  { sigla: 'Anhanguera', nome: 'Universidade Anhanguera' },
  { sigla: 'Estácio',  nome: 'Universidade Estácio de Sá' },
  { sigla: 'UNIP',     nome: 'Universidade Paulista' },
  { sigla: 'Uninove',  nome: 'Universidade Nove de Julho' },
  { sigla: 'Cruzeiro do Sul', nome: 'Universidade Cruzeiro do Sul' },
  { sigla: 'FMU',      nome: 'Faculdades Metropolitanas Unidas' },
  { sigla: 'USJT',     nome: 'Universidade São Judas Tadeu' },
  { sigla: 'UAM',      nome: 'Universidade Anhembi Morumbi' },
  { sigla: 'UMC',      nome: 'Universidade de Mogi das Cruzes' },
  { sigla: 'UnG',      nome: 'Universidade Guarulhos' },
  { sigla: 'UNINASSAU', nome: 'Universidade Maurício de Nassau' },
  { sigla: 'UNINORTE', nome: 'Centro Universitário do Norte' },
  { sigla: 'UNIASSELVI', nome: 'Centro Universitário Leonardo da Vinci' },
  { sigla: 'UNIDERP',  nome: 'Universidade para o Desenvolvimento do Estado e da Região do Pantanal' },
  { sigla: 'UNIFOR',   nome: 'Universidade de Fortaleza' },
  { sigla: 'UNIFACS',  nome: 'Universidade Salvador' },
  { sigla: 'UPF',      nome: 'Universidade de Passo Fundo' },
  { sigla: 'Feevale',  nome: 'Universidade Feevale' },
  { sigla: 'ULBRA',    nome: 'Universidade Luterana do Brasil' },
  { sigla: 'UNIFRAN',  nome: 'Universidade de Franca' },
  { sigla: 'UNISA',    nome: 'Universidade Santo Amaro' },
  { sigla: 'USS',      nome: 'Universidade Severino Sombra' },
  { sigla: 'UVV',      nome: 'Universidade Vila Velha' },
  { sigla: 'UCAM',     nome: 'Universidade Cândido Mendes' },
  { sigla: 'UVA-RJ',   nome: 'Universidade Veiga de Almeida' },
  { sigla: 'IBMR',     nome: 'Centro Universitário IBMR' },
  { sigla: 'UNICURITIBA', nome: 'Centro Universitário Curitiba' },
  { sigla: 'UP',       nome: 'Universidade Positivo' },
  { sigla: 'UNINTER',  nome: 'Centro Universitário Internacional' },
  { sigla: 'UNIVALI',  nome: 'Universidade do Vale do Itajaí' },
  { sigla: 'UNESC',    nome: 'Universidade do Extremo Sul Catarinense' },
  { sigla: 'FURB',     nome: 'Universidade Regional de Blumenau' },
  { sigla: 'FACAMP',   nome: 'Faculdades de Campinas' },
  { sigla: 'UNIFIEO',  nome: 'Centro Universitário FIEO' },
  { sigla: 'UNESA',    nome: 'Universidade Estácio de Sá' },
  { sigla: 'UNICEUB',  nome: 'Centro Universitário de Brasília' },
  { sigla: 'IDP',      nome: 'Instituto Brasileiro de Ensino, Desenvolvimento e Pesquisa' },
  { sigla: 'FAE',      nome: 'Centro Universitário FAE' },
  { sigla: 'UNIFOA',   nome: 'Centro Universitário de Volta Redonda' },
  { sigla: 'UNIFAGOC', nome: 'Centro Universitário Governador Ozanam Coelho' },
  { sigla: 'FASM',     nome: 'Faculdade Santa Marcelina' },
]

function normalize(s) {
  return String(s || '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .trim()
}

export function buscarUniversidade(input) {
  if (!input) return null
  const n = normalize(input)
  if (n.length < 2) return null
  // Exact sigla
  let m = UNIVERSIDADES.find(u => normalize(u.sigla) === n)
  if (m) return m
  // Exact nome
  m = UNIVERSIDADES.find(u => normalize(u.nome) === n)
  if (m) return m
  // Substring — only if it uniquely identifies one entry
  const matches = UNIVERSIDADES.filter(u =>
    normalize(u.sigla).includes(n) || normalize(u.nome).includes(n)
  )
  if (matches.length === 1) return matches[0]
  return null
}

export function filtrarUniversidades(input, limit = 8) {
  if (!input) return []
  const n = normalize(input)
  if (n.length < 1) return []
  const siglaStarts = []
  const nomeStarts = []
  const includes = []
  const seen = new Set()
  for (const u of UNIVERSIDADES) {
    const sn = normalize(u.sigla)
    const nn = normalize(u.nome)
    const key = sn + '|' + nn
    if (seen.has(key)) continue
    seen.add(key)
    if (sn === n || nn === n) continue
    if (sn.startsWith(n))      siglaStarts.push(u)
    else if (nn.startsWith(n)) nomeStarts.push(u)
    else if (sn.includes(n) || nn.includes(n)) includes.push(u)
  }
  return [...siglaStarts, ...nomeStarts, ...includes].slice(0, limit)
}
