import Link from 'next/link'

export default function Home() {
  return (
    <main className="min-h-screen bg-white">

      {/* Navbar */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-md border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <span className="text-green-600 font-extrabold text-xl">Point.AI</span>
          <div className="flex items-center gap-4">
            <Link href="/onboarding" className="text-gray-500 text-sm hover:text-gray-800 transition">Entrar</Link>
            <Link href="/onboarding" className="bg-green-600 text-white text-sm font-semibold px-4 py-2 rounded-xl hover:bg-green-700 transition">
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <div className="pt-32 pb-24 px-6 bg-gradient-to-b from-green-50 to-white">
        <div className="max-w-4xl mx-auto text-center">
          <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
            🤖 O assistente acadêmico que faltava no Brasil
          </span>
          <h1 className="text-6xl font-extrabold text-gray-900 leading-tight mb-6">
            Estude mais inteligente.<br />
            <span className="text-green-600">Evolua todo dia.</span>
          </h1>
          <p className="text-xl text-gray-500 mb-10 leading-relaxed max-w-2xl mx-auto">
            O Point.AI aprende com você, lembra suas matérias e te ajuda como um tutor pessoal disponível 24h — especializado no seu curso.
          </p>
          <div className="flex items-center justify-center gap-4 flex-wrap">
            <Link href="/onboarding" className="bg-green-600 text-white text-lg font-bold px-10 py-4 rounded-2xl hover:bg-green-700 transition shadow-lg shadow-green-200">
              Começar agora — é grátis
            </Link>
            <span className="text-gray-400 text-sm">Sem cartão de crédito</span>
          </div>
          <div className="flex items-center justify-center gap-8 mt-12">
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">100%</p>
              <p className="text-gray-400 text-sm">Personalizado</p>
            </div>
            <div className="w-px h-10 bg-gray-200"/>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">24h</p>
              <p className="text-gray-400 text-sm">Disponível</p>
            </div>
            <div className="w-px h-10 bg-gray-200"/>
            <div className="text-center">
              <p className="text-3xl font-extrabold text-gray-900">5+</p>
              <p className="text-gray-400 text-sm">Ferramentas</p>
            </div>
          </div>
        </div>
      </div>

      {/* Preview do app */}
      <div className="bg-gray-50 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Tudo que você precisa em um lugar</h2>
            <p className="text-gray-500">Feito especialmente para universitários brasileiros</p>
          </div>
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center text-xl mb-4">💬</div>
              <h3 className="font-bold text-gray-900 mb-2">Chat por matéria</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Cada matéria tem seu próprio chat. A IA lembra tudo que você perguntou antes e fica cada vez mais contextualizada.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center text-xl mb-4">📊</div>
              <h3 className="font-bold text-gray-900 mb-2">Notas e faltas automáticas</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Cadastre suas notas e a IA calcula sua média, quantas faltas ainda pode ter e o que precisa tirar na próxima prova.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center text-xl mb-4">📅</div>
              <h3 className="font-bold text-gray-900 mb-2">Calendário acadêmico</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Cadastre provas e prazos. A IA te avisa quando está chegando e propõe revisões na hora certa.</p>
            </div>
            <div className="bg-white rounded-2xl p-6 border border-gray-100 shadow-sm">
              <div className="w-10 h-10 bg-yellow-100 rounded-xl flex items-center justify-center text-xl mb-4">📝</div>
              <h3 className="font-bold text-gray-900 mb-2">Correção de trabalhos</h3>
              <p className="text-gray-500 text-sm leading-relaxed">Cole seu texto e receba feedback detalhado com nota estimada, pontos fortes e o que melhorar.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Como funciona */}
      <div className="py-20 px-6">
        <div className="max-w-3xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Como funciona</h2>
            <p className="text-gray-500">Pronto em menos de 2 minutos</p>
          </div>
          <div className="space-y-6">
            {[
              { num: '1', titulo: 'Cria sua conta grátis', desc: 'Sem cartão de crédito. Informa seu curso, universidade e matérias do semestre.' },
              { num: '2', titulo: 'A IA aprende com você', desc: 'O Point.AI absorve seu perfil e já começa personalizado para o seu curso e nível.' },
              { num: '3', titulo: 'Use todo dia', desc: 'Chat para dúvidas, controle de notas, calendário de provas e correção de trabalhos — tudo integrado.' },
              { num: '4', titulo: 'Evolua visivelmente', desc: 'Acompanhe seu progresso, receba alertas e veja sua média subir semana a semana.' },
            ].map((p, i) => (
              <div key={i} className="flex gap-5 items-start">
                <div className="w-10 h-10 bg-green-600 rounded-xl flex items-center justify-center text-white font-extrabold flex-shrink-0">{p.num}</div>
                <div>
                  <h3 className="font-bold text-gray-900 mb-1">{p.titulo}</h3>
                  <p className="text-gray-500 text-sm leading-relaxed">{p.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Depoimentos */}
      <div className="bg-green-600 py-20 px-6">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-3xl font-extrabold text-white text-center mb-12">O que estudantes dizem</h2>
          <div className="grid grid-cols-3 gap-6">
            {[
              { texto: 'Estava reprovando em Cálculo. O Point.AI me ajudou a entender derivadas do zero em uma semana.', autor: 'Lucas M.', curso: 'Engenharia Elétrica — USP' },
              { texto: 'Enviei a foto da minha ementa e ele montou o plano exato com os tópicos da minha professora.', autor: 'Mariana S.', curso: 'Medicina — UNIFESP' },
              { texto: 'O controle de faltas me salvou. Eu não sabia que estava quase reprovando por falta em duas matérias.', autor: 'Rafael T.', curso: 'Direito — PUC' },
            ].map((d, i) => (
              <div key={i} className="bg-white/10 rounded-2xl p-6">
                <p className="text-white/90 text-sm leading-relaxed mb-4 italic">"{d.texto}"</p>
                <p className="text-white font-semibold text-sm">{d.autor}</p>
                <p className="text-white/60 text-xs">{d.curso}</p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Preços */}
      <div className="py-20 px-6">
        <div className="max-w-4xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-extrabold text-gray-900 mb-3">Planos simples e justos</h2>
            <p className="text-gray-500">Comece grátis, assine quando quiser</p>
          </div>
          <div className="grid grid-cols-3 gap-6">
            <div className="border border-gray-200 rounded-2xl p-6">
              <p className="font-bold text-gray-900 mb-1">Grátis</p>
              <p className="text-3xl font-extrabold text-gray-900 mb-4">R$0</p>
              <ul className="space-y-2 text-sm text-gray-500 mb-6">
                <li>✅ 7 dias completo</li>
                <li>✅ Todas as funcionalidades</li>
                <li>❌ Sem limite após 7 dias</li>
              </ul>
              <Link href="/onboarding" className="block text-center bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition text-sm">
                Começar grátis
              </Link>
            </div>
            <div className="border-2 border-green-600 rounded-2xl p-6 relative">
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-green-600 text-white text-xs font-bold px-3 py-1 rounded-full">Mais popular</span>
              <p className="font-bold text-gray-900 mb-1">Mensal</p>
              <p className="text-3xl font-extrabold text-gray-900 mb-4">R$14,90<span className="text-base font-normal text-gray-400">/mês</span></p>
              <ul className="space-y-2 text-sm text-gray-500 mb-6">
                <li>✅ Chat ilimitado</li>
                <li>✅ Todas as funcionalidades</li>
                <li>✅ Sem limite de matérias</li>
              </ul>
              <Link href="/onboarding" className="block text-center bg-green-600 text-white font-semibold py-2.5 rounded-xl hover:bg-green-700 transition text-sm">
                Assinar agora
              </Link>
            </div>
            <div className="border border-gray-200 rounded-2xl p-6">
              <p className="font-bold text-gray-900 mb-1">Semestral</p>
              <p className="text-3xl font-extrabold text-gray-900 mb-4">R$59,90<span className="text-base font-normal text-gray-400">/sem</span></p>
              <ul className="space-y-2 text-sm text-gray-500 mb-6">
                <li>✅ Tudo do mensal</li>
                <li>✅ Economia de 33%</li>
                <li>✅ Ideal para um semestre</li>
              </ul>
              <Link href="/onboarding" className="block text-center bg-gray-100 text-gray-700 font-semibold py-2.5 rounded-xl hover:bg-gray-200 transition text-sm">
                Assinar semestral
              </Link>
            </div>
          </div>
        </div>
      </div>

      {/* CTA final */}
      <div className="bg-gray-900 py-20 px-6 text-center">
        <h2 className="text-4xl font-extrabold text-white mb-4">Pronto para estudar do jeito certo?</h2>
        <p className="text-gray-400 mb-8 text-lg">Junte-se a universitários que já estudam com inteligência.</p>
        <Link href="/onboarding" className="inline-block bg-green-600 text-white text-lg font-bold px-10 py-4 rounded-2xl hover:bg-green-700 transition">
          Criar minha conta grátis →
        </Link>
      </div>

      {/* Footer */}
      <footer className="py-8 px-6 border-t border-gray-100">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <span className="text-green-600 font-extrabold">Point.AI</span>
          <p className="text-gray-400 text-sm">© 2026 Point.AI — Feito para universitários brasileiros</p>
          <div className="flex gap-4 text-sm text-gray-400">
            <a href="#" className="hover:text-gray-600">Privacidade</a>
            <a href="#" className="hover:text-gray-600">Termos</a>
          </div>
        </div>
      </footer>

    </main>
  )
}