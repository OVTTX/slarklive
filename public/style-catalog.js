export const PADRAO = Object.freeze({ skin: 'slark', texto: 'padrao', moldura: 'padrao' })
export const CATALOGO = [
  { id:'slark', tipo:'skin', nome:'Slark Original', vitorias:0, cor:'#0651C3', fundo:'#000026', descricao:'O seu universo em azul-noite.' },
  { id:'noir', tipo:'skin', nome:'Noir', vitorias:0, cor:'#D1D1D1', fundo:'#000000', descricao:'Preto puro. Texto cinza-claro. O essencial em foco.' },
  { id:'aurora', tipo:'skin', nome:'Aurora', vitorias:1, cor:'#3FD08A', fundo:'#052823', descricao:'Novas conexões em verde e azul.' },
  { id:'oceano', tipo:'skin', nome:'Oceano', vitorias:3, cor:'#45BDEB', fundo:'#051C35', descricao:'Azul profundo para explorar ideias.' },
  { id:'ametista', tipo:'skin', nome:'Ametista', vitorias:8, cor:'#BF88FF', fundo:'#200E38', descricao:'Uma atmosfera violeta para criar.' },
  { id:'rosa', tipo:'skin', nome:'Rosa Nebulosa', vitorias:5, cor:'#F4A5D0', fundo:'#210F23', descricao:'Rosa e ameixa para iluminar suas ideias.' },
  { id:'solar', tipo:'skin', nome:'Pôr do Sol', vitorias:7, cor:'#FFBD8F', fundo:'#26130F', descricao:'Terracota e laranja no ritmo de novas descobertas.' },
  { id:'floresta', tipo:'skin', nome:'Floresta', vitorias:10, cor:'#96D7A7', fundo:'#0D2019', descricao:'Verde-musgo e tons naturais para se concentrar.' },
  { id:'cosmos', tipo:'skin', nome:'Cosmos', vitorias:15, cor:'#BDB5FF', fundo:'#14102C', descricao:'Índigo e lavanda para explorar além do óbvio.' },
  { id:'grafite', tipo:'skin', nome:'Grafite', vitorias:30, cor:'#C3D1DC', fundo:'#14171B', descricao:'Carvão e prata em uma edição minimalista.' },
  { id:'rubi', tipo:'skin', nome:'Rubi', vitorias:40, cor:'#FFA4B8', fundo:'#250E18', descricao:'Vinho e rubi para celebrar sua trajetória.' },
  { id:'ouro', tipo:'skin', nome:'Slark Gold', vitorias:25, cor:'#8A6318', fundo:'#FFFCF5', descricao:'Edição especial em branco, marfim e dourado.' },
  { id:'padrao', tipo:'texto', nome:'Texto original', vitorias:0, cor:'#FFFFFF' },
  { id:'gelo', tipo:'texto', nome:'Gelo', vitorias:1, cor:'#BDEEFF' },
  { id:'azul', tipo:'texto', nome:'Azul celeste', vitorias:3, cor:'#9BC5FF' },
  { id:'dourado', tipo:'texto', nome:'Luz dourada', vitorias:20, cor:'#E8C878' },
  { id:'padrao', tipo:'moldura', nome:'Sem moldura', vitorias:0, cor:'#7182A3' },
  { id:'orbita', tipo:'moldura', nome:'Órbita', vitorias:3, cor:'#6FA8FF' },
  { id:'constelacao', tipo:'moldura', nome:'Constelação', vitorias:8, cor:'#BF88FF' },
  { id:'ouro', tipo:'moldura', nome:'Moldura Gold', vitorias:25, cor:'#C79D42' },
]
export function acessoCompleto(perfil) {
  return perfil?.perfil === 'admin_slark' || /vtx/i.test(`${perfil?.nome || ''} ${perfil?.email || ''}`)
}
export function podeUsar(item, vitorias = 0, completo = false) {
  return Boolean(item) && (completo || Math.max(0, Number(vitorias) || 0) >= item.vitorias)
}
export function preferenciasValidas(preferencias, vitorias, completo) {
  return Object.fromEntries(Object.entries(PADRAO).map(([tipo, fallback]) => {
    const item = CATALOGO.find(i => i.tipo === tipo && i.id === preferencias?.[tipo])
    return [tipo, podeUsar(item, vitorias, completo) ? item.id : fallback]
  }))
}
