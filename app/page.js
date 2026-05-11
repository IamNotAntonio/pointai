export default function Home() {
  return (
    <main className="min-h-screen bg-white">
      {/* Hero Section */}
      <div className="max-w-4xl mx-auto px-6 py-20 text-center">
        <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-4 py-2 rounded-full mb-6">
          🤖 Inteligência Artificial para Universitários
        </span>
        <h1 className="text-5xl font-extrabold text-gray-900 leading-tight mb-6">
          Seu assistente acadêmico<br />
          <span className="text-green-600">personalizado com IA</span>
        </h1>
        <p className="text-xl text-gray-500 mb-10 leading-relaxed">
          O Point.AI aprende com você, lembra suas matérias e te ajuda<br />
          a evoluir todos os dias — como um tutor disponível 24h.
        </p>
        <a href="/onboarding" className="inline-block bg-green-600 text-white text-lg font-bold px-10 py-4 rounded-2xl hover:bg-green-700 transition">
          Começar agora — é grátis
        </a>
      </div>

      {/* Features */}
      <div className="max-w-5xl mx-auto px-6 pb-20 grid grid-cols-3 gap-6">
        {[
          { icon: "💬", title: "Chat por matéria", desc: "Cada matéria tem seu próprio chat. A IA lembra tudo que você perguntou antes." },
          { icon: "📊", title: "Notas e faltas", desc: "Controle automático de médias e faltas. Saiba exatamente onde você está." },
          { icon: "📅", title: "Calendário acadêmico", desc: "Cadastre provas e prazos. A IA te avisa e propõe revisões na hora certa." },
          { icon: "📈", title: "Evolução visível", desc: "Acompanhe seu progresso com gráficos e marcos de aprendizado." },
          { icon: "📝", title: "Correção de trabalhos", desc: "Cole seu texto e receba feedback detalhado com nota estimada." },
          { icon: "🎯", title: "Proativo", desc: "A IA não espera você perguntar — ela sugere o que você precisa estudar." },
        ].map((f, i) => (
          <div key={i} className="bg-gray-50 rounded-2xl p-6 border border-gray-100">
            <div className="text-3xl mb-3">{f.icon}</div>
            <h3 className="font-bold text-gray-900 mb-2">{f.title}</h3>
            <p className="text-gray-500 text-sm leading-relaxed">{f.desc}</p>
          </div>
        ))}
      </div>

      {/* CTA */}
      <div className="bg-green-600 py-20 text-center">
        <h2 className="text-3xl font-extrabold text-white mb-4">
          Pronto para estudar do jeito certo?
        </h2>
        <p className="text-green-100 mb-8 text-lg">Gratuito para começar. Sem cartão de crédito.</p>
        <a href="/onboarding" className="inline-block bg-white text-green-600 text-lg font-bold px-10 py-4 rounded-2xl hover:bg-green-50 transition">
          Criar minha conta
        </a>
      </div>

      {/* Footer */}
      <footer className="text-center py-8 text-gray-400 text-sm">
        Point.AI © 2026 — Feito para universitários brasileiros
      </footer>
    </main>
  )
}