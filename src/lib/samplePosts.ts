// Posts de exemplo para pré-visualizar os componentes de blog no app.
// No WordPress (e futuramente no Kairo CMS) os componentes usam os posts reais.
import { placeholderImage } from './images';

export interface SamplePost {
  title: string;
  excerpt: string;
  date: string;
  author: string;
  category: string;
  tags: string[];
  image: string;
}

export const SAMPLE_CATEGORIES = [
  { name: 'Novidades', count: 8 },
  { name: 'Dicas', count: 12 },
  { name: 'Tutoriais', count: 5 },
  { name: 'Bastidores', count: 3 },
];

export const SAMPLE_TAGS = [
  { name: 'design', weight: 3 },
  { name: 'acessibilidade', weight: 2 },
  { name: 'wordpress', weight: 3 },
  { name: 'seo', weight: 1 },
  { name: 'produtividade', weight: 2 },
  { name: 'marketing', weight: 1 },
  { name: 'celular', weight: 2 },
];

export const SAMPLE_POSTS: SamplePost[] = [
  {
    title: 'Como criar um site acessível em 5 passos',
    excerpt: 'Contraste, textos alternativos e navegação por teclado: o básico que faz seu site funcionar para todas as pessoas.',
    date: '12 de novembro de 2026',
    author: 'Ana Souza',
    category: 'Dicas',
    tags: ['acessibilidade', 'design'],
    image: placeholderImage('', 210),
  },
  {
    title: 'Novidades da versão 2.0',
    excerpt: 'Containers responsivos, modo escuro e exportação direta para o WordPress. Veja tudo o que mudou.',
    date: '5 de novembro de 2026',
    author: 'Equipe',
    category: 'Novidades',
    tags: ['wordpress'],
    image: placeholderImage('', 260),
  },
  {
    title: 'Guia rápido de SEO para pequenos negócios',
    excerpt: 'Títulos, descrições e boas URLs ajudam o Google a entender — e mostrar — o seu site.',
    date: '28 de outubro de 2026',
    author: 'Carlos Lima',
    category: 'Tutoriais',
    tags: ['seo', 'marketing'],
    image: placeholderImage('', 30),
  },
  {
    title: 'Fotos que vendem: dicas para a sua galeria',
    excerpt: 'Luz natural, fundo limpo e consistência. Pequenos cuidados que valorizam seus produtos.',
    date: '20 de outubro de 2026',
    author: 'Ana Souza',
    category: 'Dicas',
    tags: ['design'],
    image: placeholderImage('', 330),
  },
  {
    title: 'Bastidores: como desenhamos os novos temas',
    excerpt: 'Do rascunho no papel ao vidro fosco do Aurora — o processo por trás dos temas.',
    date: '9 de outubro de 2026',
    author: 'Equipe',
    category: 'Bastidores',
    tags: ['design'],
    image: placeholderImage('', 280),
  },
  {
    title: 'Seu site no celular: o que conferir antes de publicar',
    excerpt: 'Menu, tamanho dos botões e velocidade. Uma lista simples para não esquecer nada.',
    date: '1 de outubro de 2026',
    author: 'Carlos Lima',
    category: 'Tutoriais',
    tags: ['celular', 'produtividade'],
    image: placeholderImage('', 160),
  },
];

export const SAMPLE_CONTENT = [
  'Este é o conteúdo do post. No WordPress, aqui aparece o texto que você escreve no editor de posts — com títulos, imagens, listas e tudo mais.',
  'O layout desta página (cabeçalho, imagem destacada, informações e navegação) vem do "Modelo de post" que você desenha no Website Builder Suite.',
];
