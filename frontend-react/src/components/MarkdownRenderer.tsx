import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { atomDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface MarkdownRendererProps {
  content: string;
}

export function MarkdownRenderer({ content }: MarkdownRendererProps) {
  const backendUrl = "http://localhost:8000";

  const transformImageUri = (src: string) => {
    if (src.startsWith("../images/")) {
      return `${backendUrl}/static/images/${src.replace("../images/", "")}`;
    }
    if (src.startsWith("/")) {
      return `${backendUrl}${src}`;
    }
    return src;
  };

  return (
    <div className="markdown-container">
      <ReactMarkdown
        remarkPlugins={[remarkGfm, remarkMath]}
        rehypePlugins={[rehypeKatex]}
        urlTransform={transformImageUri}
        components={{
          // --- HEADINGS: High Contrast and Distinct Fonts ---
          h1: ({ node, ...props }) => (
            <h1 className="text-5xl md:text-6xl font-black text-white mb-12 mt-8 tracking-tighter leading-tight border-l-8 border-blue-500 pl-6 py-2 bg-gradient-to-r from-blue-500/10 to-transparent rounded-r-xl" {...props} />
          ),
          h2: ({ node, ...props }) => (
            <h2 className="text-3xl md:text-4xl font-extrabold text-cyan-400 mb-8 mt-24 tracking-tight flex items-center gap-3 border-b border-white/10 pb-4" {...props} />
          ),
          h3: ({ node, ...props }) => (
            <h3 className="text-2xl font-bold text-purple-400 mb-4 mt-12 tracking-wide uppercase" {...props} />
          ),
          
          // --- BODY TEXT: Clean, readable, and smaller than headings ---
          p: ({ node, ...props }) => (
            <p className="text-slate-300 text-lg leading-relaxed mb-8 font-normal" {...props} />
          ),
          
          // --- CITATIONS / LINKS: Blue and underlined like Streamlit ---
          a: ({ node, ...props }) => (
            <a 
              className="text-blue-400 font-medium underline underline-offset-4 hover:text-blue-300 transition-colors" 
              target="_blank" 
              rel="noopener noreferrer" 
              {...props} 
            />
          ),

          // --- CODE BLOCKS: Proper Syntax Highlighting ---
          code({ node, inline, className, children, ...props }: any) {
            const match = /language-(\w+)/.exec(className || '');
            return !inline && match ? (
              <div className="my-8 rounded-2xl overflow-hidden border border-white/10 shadow-2xl">
                <div className="bg-white/5 px-4 py-2 text-xs font-mono text-slate-400 flex justify-between items-center border-b border-white/5">
                  <span>{match[1].toUpperCase()}</span>
                </div>
                <SyntaxHighlighter
                  {...props}
                  style={atomDark}
                  language={match[1]}
                  PreTag="div"
                  customStyle={{
                    margin: 0,
                    padding: '1.5rem',
                    fontSize: '0.9rem',
                    background: 'transparent',
                  }}
                >
                  {String(children).replace(/\n$/, '')}
                </SyntaxHighlighter>
              </div>
            ) : (
              <code className="bg-blue-500/20 text-blue-300 px-1.5 py-0.5 rounded font-mono text-sm border border-blue-500/20" {...props}>
                {children}
              </code>
            );
          },

          // --- LISTS: Better Spacing ---
          ul: ({ node, ...props }) => <ul className="list-disc pl-8 mb-8 space-y-3 text-slate-300 text-lg" {...props} />,
          ol: ({ node, ...props }) => <ol className="list-decimal pl-8 mb-8 space-y-3 text-slate-300 text-lg" {...props} />,
          li: ({ node, ...props }) => <li className="pl-2" {...props} />,

          // --- IMAGES: Consistent with your previous request ---
          img: ({ node, ...props }) => (
            <div className="my-16 flex flex-col items-center group">
              <div className="relative overflow-hidden rounded-[2.5rem] border border-white/10 shadow-[0_0_50px_rgba(0,0,0,0.5)]">
                <img 
                  {...props} 
                  className="max-h-[600px] w-auto transition-transform duration-700 group-hover:scale-[1.02]" 
                />
              </div>
              {props.alt && (
                <p className="mt-6 text-sm text-slate-500 font-bold tracking-[0.2em] uppercase italic">
                  {props.alt}
                </p>
              )}
            </div>
          ),

          // --- BLOCKQUOTES ---
          blockquote: ({ node, ...props }) => (
            <blockquote className="border-l-4 border-purple-500 bg-purple-500/5 p-6 rounded-r-2xl my-8 italic text-slate-300" {...props} />
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
