import { useCallback, useEffect, useRef, useState, type FormEvent } from "react"
import { cast, fatherEyes, sceneEyes, type Actor, type Eye } from "./cast"
import { pages, ui, type Block, type Lang, type Page } from "./story"

const LANGS: Lang[] = ["uk", "en", "no"]
const STORAGE_KEY = "frogs-lang"
const OPEN_KEY = "frogs-open"
/** SHA-256 of the reading password. The book stays behind this gate. */
const PASSWORD_HASH = "8f6a0cdac0951a480404b17892e32ff726aceac299096b1da78f661cf5a5eca6"

async function sha256(text: string) {
  const data = new TextEncoder().encode(text)
  const buf = await crypto.subtle.digest("SHA-256", data)
  return [...new Uint8Array(buf)].map((byte) => byte.toString(16).padStart(2, "0")).join("")
}

function Gate({ lang, onOpen }: { lang: Lang; onOpen: () => void }) {
  const [value, setValue] = useState("")
  const [wrong, setWrong] = useState(false)

  const submit = async (event: FormEvent) => {
    event.preventDefault()
    const hash = await sha256(value)
    if (hash === PASSWORD_HASH) {
      sessionStorage.setItem(OPEN_KEY, "1")
      onOpen()
      return
    }
    setWrong(true)
  }

  return (
    <form className="gate" onSubmit={submit}>
      <h1>{ui.title[lang]}</h1>
      <p>{ui.gate[lang]}</p>
      <label>
        <span className="sr">{ui.password[lang]}</span>
        <input
          type="password"
          value={value}
          autoFocus
          autoComplete="current-password"
          placeholder={ui.password[lang]}
          onChange={(event) => {
            setValue(event.target.value)
            setWrong(false)
          }}
        />
      </label>
      {wrong && <p className="gate-wrong">{ui.wrong[lang]}</p>}
      <button type="submit" className="turn">{ui.open[lang]}</button>
    </form>
  )
}

function initialLang(): Lang {
  const saved = localStorage.getItem(STORAGE_KEY)
  if (saved === "uk" || saved === "en" || saved === "no") return saved
  const n = navigator.language.toLowerCase()
  if (n.startsWith("uk")) return "uk"
  if (n.startsWith("no") || n.startsWith("nb") || n.startsWith("nn")) return "no"
  if (n.startsWith("en")) return "en"
  return "uk"
}

function Blocks({ blocks, lead = true }: { blocks: Block[]; lead?: boolean }) {
  return (
    <div className="blocks">
      {blocks.map((block, i) => {
        if (block.kind === "poem") {
          lead = false
          return (
            <p className="poem" key={i}>
              {block.lines.map((line, lineIndex) => (
                <span key={lineIndex}>{line}</span>
              ))}
            </p>
          )
        }
        if (block.kind === "say") {
          lead = false
          const spoken = /^(—|-)/.test(block.text) ? block.text : `— ${block.text}`
          return (
            <p className="say" key={i}>
              {spoken}
            </p>
          )
        }
        const className = lead && /^\p{L}/u.test(block.text) ? "lead" : undefined
        if (className || block.kind === "p") lead = false
        return (
          <p className={className} key={i}>
            {block.text}
          </p>
        )
      })}
    </div>
  )
}

function Lids({ eyes, blink }: { eyes?: Eye[]; blink?: string }) {
  if (!eyes) return null
  return eyes.map((eye, index) => (
    <i
      key={index}
      className="lid"
      style={{
        left: eye.x,
        top: eye.y,
        width: eye.w,
        height: eye.h,
        background: eye.color,
        animationDelay: blink,
      }}
    />
  ))
}

function Actors({ actors }: { actors: Actor[] }) {
  return actors.map((actor) => (
    <div
      key={actor.src}
      className="actor-slot"
      style={{
        ["--x" as string]: actor.x,
        ["--r" as string]: actor.r,
        ["--b" as string]: actor.b,
        ["--t" as string]: actor.t,
        ["--w" as string]: actor.w,
      }}
    >
      <div className={`actor ${actor.motion}`}>
        <img src={actor.src} alt="" />
        <Lids eyes={actor.eyes} blink={actor.blink} />
      </div>
    </div>
  ))
}

function Scene({ page, lang, hopped, onHop }: { page: Page; lang: Lang; hopped: boolean; onHop: () => void }) {
  const actors = (cast[page.id] ?? []).filter((actor) => !actor.spread)
  return (
    <div
      className={`scene mood-${page.mood}${page.fit === "panel" ? " panel" : ""}`}
      style={{ backgroundImage: `url(${page.image})` }}
      role="img"
      aria-label={page.alt[lang]}
    >
      <span className="sheen" aria-hidden="true" />
      {page.mood === "night" && (
        <span className="sparkles" aria-hidden="true">
          <i /><i /><i /><i /><i /><i />
        </span>
      )}
      {page.mood === "water" && <span className="ripples" aria-hidden="true" />}
      {page.sprite === "frog" && (
        <button
          type="button"
          className={hopped ? "sprite sprite-frog hop" : "sprite sprite-frog"}
          onClick={onHop}
          aria-label={ui.hop[lang]}
        >
          <img src="art/frog.png" alt="" />
        </button>
      )}
      <Actors actors={actors} />
      <Lids eyes={sceneEyes[page.id]} blink="0.5s" />
    </div>
  )
}

function Spread({
  page,
  index,
  lang,
  live,
  onTurn,
}: {
  page: Page
  index: number
  lang: Lang
  live: boolean
  onTurn: () => void
}) {
  const [hopped, setHopped] = useState(false)
  const hop = () => {
    setHopped(true)
    window.setTimeout(() => setHopped(false), 700)
  }

  const blocks = page.text[lang]
  const plate = page.breakAfter != null

  return (
    <section
      className={`spread art-${page.art} ${page.columns ? "cols" : ""} ${page.sprite === "father" ? "has-father" : ""} ${live ? "is-live" : ""}`}
      data-index={index}
      aria-label={`${ui.pages[lang]} ${index + 1}`}
    >
      {!plate && <Scene page={page} lang={lang} hopped={hopped} onHop={hop} />}
      {page.sprite === "father" && (
        <div className="sprite sprite-father">
          <img src="cast/father.png" alt="" />
          <Lids eyes={fatherEyes} blink="0.9s" />
        </div>
      )}
      <Actors actors={(cast[page.id] ?? []).filter((actor) => actor.spread)} />
      {plate ? (
        <article className="sheet plate">
          <img className="plate-img" src={page.image} alt={page.alt[lang]} />
          <div className="plate-col plate-left">
            <Blocks blocks={blocks.slice(0, page.breakAfter)} lead={false} />
          </div>
          <div className="plate-col plate-right">
            <Blocks blocks={blocks.slice(page.breakAfter)} lead={false} />
          </div>
        </article>
      ) : (
        <article className="sheet">
          {page.art === "full" && <h1>{ui.title[lang]}</h1>}
          <Blocks blocks={blocks} />
          {page.art === "full" && (
            <button type="button" className="turn" onClick={onTurn}>
              {ui.turn[lang]}
              <span aria-hidden="true">↓</span>
            </button>
          )}
        </article>
      )}
    </section>
  )
}

export default function App() {
  const [lang, setLang] = useState<Lang>(initialLang)
  const [page, setPage] = useState(0)
  const [open, setOpen] = useState(() => sessionStorage.getItem(OPEN_KEY) === "1")
  const scroller = useRef<HTMLElement>(null)

  useEffect(() => {
    document.documentElement.lang = lang === "uk" ? "uk" : lang === "no" ? "nb" : "en"
    document.title = ui.title[lang]
    localStorage.setItem(STORAGE_KEY, lang)
  }, [lang])

  useEffect(() => {
    const root = scroller.current
    if (!root) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => b.intersectionRatio - a.intersectionRatio)[0]
        if (!visible) return
        const index = Number((visible.target as HTMLElement).dataset.index)
        if (!Number.isNaN(index)) setPage(index)
      },
      { root, threshold: [0.55, 0.75] },
    )
    Array.from(root.children).forEach((child) => observer.observe(child))
    return () => observer.disconnect()
  }, [open])

  const go = useCallback((index: number) => {
    const root = scroller.current
    const next = Math.max(0, Math.min(pages.length - 1, index))
    const target = root?.children[next] as HTMLElement | undefined
    target?.scrollIntoView({ behavior: "smooth", block: "start" })
  }, [])

  useEffect(() => {
    if (!open) return
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowDown" || event.key === "PageDown" || event.key === "ArrowRight") {
        event.preventDefault()
        go(page + 1)
      }
      if (event.key === "ArrowUp" || event.key === "PageUp" || event.key === "ArrowLeft") {
        event.preventDefault()
        go(page - 1)
      }
      if (event.key === "Home") go(0)
      if (event.key === "End") go(pages.length - 1)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [go, page, open])

  if (!open) {
    return (
      <div className="app">
        <header className="topbar">
          <p className="mark">{ui.title[lang]}</p>
          <div className="langs" role="group" aria-label={ui.lang[lang]}>
            {LANGS.map((code) => (
              <button
                key={code}
                type="button"
                className={code === lang ? "on" : ""}
                aria-pressed={code === lang}
                onClick={() => setLang(code)}
              >
                {code === "uk" ? "УК" : code === "en" ? "EN" : "NO"}
                <span className="sr">{ui.lang[code]}</span>
              </button>
            ))}
          </div>
        </header>
        <Gate lang={lang} onOpen={() => setOpen(true)} />
      </div>
    )
  }

  return (
    <div className="app">
      <header className="topbar">
        <p className="mark">{ui.title[lang]}</p>
        <div className="langs" role="group" aria-label={ui.lang[lang]}>
          {LANGS.map((code) => (
            <button
              key={code}
              type="button"
              className={code === lang ? "on" : ""}
              aria-pressed={code === lang}
              onClick={() => setLang(code)}
            >
              {code === "uk" ? "УК" : code === "en" ? "EN" : "NO"}
              <span className="sr">{ui.lang[code]}</span>
            </button>
          ))}
        </div>
      </header>

      <main className="scroller" ref={scroller}>
        {pages.map((item, index) => (
          <Spread
            key={item.id}
            page={item}
            index={index}
            lang={lang}
            live={index === page}
            onTurn={() => go(1)}
          />
        ))}
      </main>

      <nav className="pager" aria-label={ui.pages[lang]}>
        <button type="button" onClick={() => go(page - 1)} disabled={page === 0} aria-label={ui.prev[lang]}>
          ↑
        </button>
        <ol>
          {pages.map((item, index) => (
            <li key={item.id}>
              <button
                type="button"
                className={index === page ? "on" : ""}
                aria-current={index === page ? "true" : undefined}
                aria-label={`${ui.pages[lang]} ${index + 1}`}
                onClick={() => go(index)}
              />
            </li>
          ))}
        </ol>
        <span className="count">
          {page + 1} / {pages.length}
        </span>
        <button
          type="button"
          onClick={() => go(page + 1)}
          disabled={page === pages.length - 1}
          aria-label={ui.next[lang]}
        >
          ↓
        </button>
      </nav>
    </div>
  )
}
