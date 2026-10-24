import { useRef, useState } from "react";
import usePersistedState from "../hooks/usePersistedState.js";
import { BadgeCheck, Camera, Heart, ImagePlus, Lightbulb, MessageCircle, Send, Sparkles } from "lucide-react";
import Card from "../components/ui/Card.jsx";
import CardHeader from "../components/ui/CardHeader.jsx";
import StatCard from "../components/ui/StatCard.jsx";
import Avatar from "../components/ui/Avatar.jsx";
import PageHeader from "../components/ui/PageHeader.jsx";
import Modal from "../components/ui/Modal.jsx";
import FilterChips from "../components/ui/FilterChips.jsx";
import SearchBar from "../components/ui/SearchBar.jsx";
import Button, { inputClass } from "../components/ui/Button.jsx";
import { useFund } from "../context/FundContext.jsx";
import { prettyDate, today } from "../utils/dates.js";
import { fmt } from "../utils/formatters.js";
import { fileToDataUrl } from "../utils/images.js";

/* ---------- one post ---------- */
function PostCard({ post, expense, author, onOpenImage }) {
  const { toggleLike, addComment } = useFund();
  const [showComments, setShowComments] = useState(false);
  const [draft, setDraft] = useState("");
  const isProof = post.kind === "proof";

  const send = () => {
    if (!draft.trim()) return;
    addComment(post.id, draft.trim(), author);
    setDraft("");
  };

  return (
    <Card className="flex flex-col">
      <div className="mb-3 flex items-center gap-3">
        <Avatar name={post.author} index={post.id % 6} size="h-9 w-9" />
        <div className="flex-1">
          <p className="text-sm font-medium">{post.author}</p>
          <p className="text-xs text-stone-400">{prettyDate(post.date)}</p>
        </div>
        <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs ${isProof ? "bg-emerald-50 text-emerald-700" : "bg-sky-50 text-sky-700"}`}>
          {isProof ? <Camera size={11} /> : <Lightbulb size={11} />} {isProof ? "Proof of work" : "Idea"}
        </span>
      </div>

      {post.image && (
        <button onClick={() => onOpenImage(post.image)} className="mb-3 block overflow-hidden rounded-2xl">
          <img src={post.image} alt="" className="h-48 w-full object-cover transition hover:scale-[1.02]" />
        </button>
      )}
      <p className="text-sm leading-relaxed text-stone-700">{post.text}</p>

      {expense && (
        <p className="mt-3 inline-flex w-fit items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1 text-xs text-stone-600">
          <BadgeCheck size={12} className="text-emerald-600" /> Backs: {expense.title} · {fmt(expense.amount)}
        </p>
      )}

      <div className="mt-4 flex items-center gap-2 border-t border-stone-100 pt-3">
        <button onClick={() => toggleLike(post.id)}
          className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs transition ${post.liked ? "bg-rose-50 text-rose-600" : "bg-stone-100 text-stone-600 hover:bg-stone-200"}`}>
          <Heart size={13} fill={post.liked ? "currentColor" : "none"} /> {post.likes}
        </button>
        <button onClick={() => setShowComments(!showComments)} className="inline-flex items-center gap-1.5 rounded-full bg-stone-100 px-3 py-1.5 text-xs text-stone-600 hover:bg-stone-200">
          <MessageCircle size={13} /> {post.comments.length}
        </button>
      </div>

      {showComments && (
        <div className="mt-3 space-y-2">
          {post.comments.map((c) => (
            <p key={c.id} className="rounded-2xl bg-stone-50 px-3 py-2 text-sm"><b className="font-medium">{c.author}</b> <span className="text-stone-600">{c.text}</span></p>
          ))}
          <div className="flex gap-2">
            <input value={draft} onChange={(e) => setDraft(e.target.value)} onKeyDown={(e) => e.key === "Enter" && send()} placeholder="Write a comment" className={`${inputClass} flex-1`} />
            <button onClick={send} aria-label="Send comment" className="flex h-9 w-9 items-center justify-center rounded-full bg-stone-900 text-white"><Send size={14} /></button>
          </div>
        </div>
      )}
    </Card>
  );
}

/* ---------- page ---------- */
export default function IdeasProofPage() {
  const { posts, expenses, isAdmin, addPost, linkProof } = useFund();
  const author = isAdmin ? "Admin" : "Member";

  const [kind, setKind] = useState("proof");
  const [text, setText] = useState("");
  const [image, setImage] = useState("");
  const [expenseId, setExpenseId] = useState("");
  const [dragging, setDragging] = useState(false);
  const [filter, setFilter] = useState("all");
  const [query, setQuery] = useState("");
  const [sort, setSort] = usePersistedState("ideas.sort", "latest");
  const [photoError, setPhotoError] = useState("");
  const [lightbox, setLightbox] = useState("");
  const composerRef = useRef(null);
  const textRef = useRef(null);

  const awaiting = expenses.filter((e) => !e.postId);
  const proofCount = posts.filter((p) => p.kind === "proof").length;
  const ideaCount = posts.length - proofCount;
  const backed = expenses.length - awaiting.length;
  const topIdeas = posts.filter((p) => p.kind === "idea").sort((a, b) => b.likes - a.likes).slice(0, 3);

  const feed = posts
    .filter((p) => filter === "all" || p.kind === filter)
    .filter((p) => p.text.toLowerCase().includes(query.toLowerCase()) || p.author.toLowerCase().includes(query.toLowerCase()))
    .sort((a, b) => (sort === "liked" ? b.likes - a.likes : b.id - a.id));

  // resized to a small JPEG data URL: nothing to revoke, and safe to store or upload
  const readFile = async (file) => {
    setPhotoError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) { setPhotoError("Please choose an image file."); return; }
    try { setImage(await fileToDataUrl(file)); } catch (err) { setPhotoError(err.message); }
  };

  const attachFor = (e) => {
    setKind("proof");
    setExpenseId(String(e.id));
    setText((t) => t || `Proof for ${e.title}: `);
    composerRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    setTimeout(() => textRef.current?.focus(), 300);
  };

  const submit = () => {
    if (!text.trim()) return;
    const id = addPost({ author, text: text.trim(), image, kind, date: today() });
    // only the admin attaches proof to expenses (spending is admin-approved)
    if (isAdmin && kind === "proof" && expenseId) linkProof(Number(expenseId), id);
    setText(""); setImage(""); setExpenseId(""); setPhotoError("");
  };

  return (
    <>
      <PageHeader title="Ideas & proof" subtitle="Share suggestions and photos that show what the money achieved." />

      <div className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard label="Total posts" value={posts.length} sub="Ideas and proof combined" icon={Sparkles} />
          <StatCard label="Proof of work" value={proofCount} sub="Photos and updates" icon={Camera} />
          <StatCard label="Ideas shared" value={ideaCount} sub="Suggestions from members" icon={Lightbulb} />
          <StatCard label="Spending with proof" value={`${backed} / ${expenses.length}`} sub={awaiting.length ? `${awaiting.length} awaiting proof` : "Everything is backed up"} icon={BadgeCheck} dark />
        </div>

        {/* ---------- composer ---------- */}
        <Card>
          <div ref={composerRef} />
          <CardHeader title="Share an update" subtitle="Everyone in the group will see this"
            right={
              <div className="flex rounded-full bg-stone-100 p-1 text-sm">
                {[["proof", "Proof of work", Camera], ["idea", "Idea", Lightbulb]].map(([id, label, Icon]) => (
                  <button key={id} onClick={() => setKind(id)} className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 transition ${kind === id ? "bg-stone-900 text-white" : "text-stone-600"}`}>
                    <Icon size={13} /> {label}
                  </button>
                ))}
              </div>
            } />
          <div className="grid gap-4 md:grid-cols-5">
            <div className="space-y-3 md:col-span-3">
              <textarea ref={textRef} rows={5} value={text} onChange={(e) => setText(e.target.value)}
                placeholder={kind === "proof" ? "What was done? Mention the site, quantities, who was involved…" : "What do you suggest the group should do?"}
                className={`${inputClass} w-full`} />
              {isAdmin && kind === "proof" && (
                <select value={expenseId} onChange={(e) => setExpenseId(e.target.value)} className={`${inputClass} w-full`}>
                  <option value="">Link to an expense (optional)</option>
                  {awaiting.map((e) => <option key={e.id} value={e.id}>{e.title} · {fmt(e.amount)}</option>)}
                </select>
              )}
            </div>
            <label onDragOver={(e) => { e.preventDefault(); setDragging(true); }} onDragLeave={() => setDragging(false)}
              onDrop={(e) => { e.preventDefault(); setDragging(false); readFile(e.dataTransfer.files?.[0]); }}
              className={`flex min-h-[10rem] cursor-pointer flex-col items-center justify-center gap-2 overflow-hidden rounded-2xl border-2 border-dashed text-center text-sm text-stone-500 transition md:col-span-2 ${dragging ? "border-accent bg-orange-50" : "border-stone-200 hover:bg-stone-50"}`}>
              {image ? <img src={image} alt="Preview" className="h-full max-h-48 w-full object-cover" /> : (<><ImagePlus size={24} /><span>Drop a photo here<br />or click to browse</span></>)}
              <input type="file" accept="image/*" className="hidden" onChange={(e) => readFile(e.target.files?.[0])} />
            </label>
          </div>
          {/* real app: upload to storage (S3/Cloudinary) and keep the returned URL */}
          <div className="mt-4 flex items-center justify-between gap-3">
            {image ? <button onClick={() => setImage("")} className="text-xs text-stone-500 underline">Remove photo</button> : photoError ? <span className="text-xs text-rose-600">{photoError}</span> : <span className="text-xs text-stone-400">Photos make proof far more convincing.</span>}
            <Button onClick={submit} disabled={!text.trim()} className="disabled:cursor-not-allowed disabled:bg-stone-200 disabled:text-stone-400"><Send size={14} /> Post</Button>
          </div>
        </Card>

        <div className="grid gap-4 lg:grid-cols-12">
          {/* ---------- feed ---------- */}
          <div className="space-y-4 lg:col-span-8">
            <Card>
              <div className="flex flex-wrap items-center gap-3">
                <SearchBar value={query} onChange={setQuery} placeholder="Search posts" className="min-w-[10rem] flex-1" />
                <select value={sort} onChange={(e) => setSort(e.target.value)} className={inputClass} aria-label="Sort posts">
                  <option value="latest">Latest</option>
                  <option value="liked">Most liked</option>
                </select>
              </div>
              <div className="mt-3">
                <FilterChips value={filter} onChange={setFilter} options={[{ id: "all", label: "All", count: posts.length }, { id: "proof", label: "Proof", count: proofCount }, { id: "idea", label: "Ideas", count: ideaCount }]} />
              </div>
            </Card>

            <div className="grid gap-4 md:grid-cols-2">
              {feed.map((p) => (
                <PostCard key={p.id} post={p} author={author} expense={expenses.find((e) => e.postId === p.id)} onOpenImage={setLightbox} />
              ))}
            </div>
            {!feed.length && <Card><p className="py-6 text-center text-sm text-stone-500">No posts match your filters.</p></Card>}
          </div>

          {/* ---------- side column ---------- */}
          <div className="space-y-4 lg:col-span-4">
            <Card>
              <CardHeader title="Awaiting proof" subtitle={isAdmin ? "Expenses with nothing attached" : "Expenses with nothing attached. The admin links proof."} />
              <ul className="space-y-3">
                {awaiting.map((e) => (
                  <li key={e.id} className="flex items-center gap-3 rounded-2xl border border-stone-100 p-3">
                    <div className="min-w-0 flex-1"><p className="truncate text-sm font-medium">{e.title}</p><p className="text-xs text-stone-400">{fmt(e.amount)} · {prettyDate(e.date)}</p></div>
                    {isAdmin && <button onClick={() => attachFor(e)} className="rounded-full bg-accent px-3 py-1.5 text-xs text-white hover:opacity-90">Add proof</button>}
                  </li>
                ))}
                {!awaiting.length && <p className="text-sm text-emerald-700">Every expense has proof attached.</p>}
              </ul>
            </Card>

            <Card>
              <CardHeader title="Top ideas" subtitle="Most liked suggestions" />
              <ul className="space-y-3">
                {topIdeas.map((p) => (
                  <li key={p.id} className="flex items-start gap-3">
                    <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-sky-50 text-sky-600"><Lightbulb size={14} /></span>
                    <div className="min-w-0 flex-1"><p className="line-clamp-2 text-sm text-stone-700">{p.text}</p><p className="mt-0.5 text-xs text-stone-400">{p.author} · {p.likes} like{p.likes === 1 ? "" : "s"}</p></div>
                  </li>
                ))}
                {!topIdeas.length && <p className="text-sm text-stone-500">No ideas yet. Be the first to share one.</p>}
              </ul>
            </Card>
          </div>
        </div>
      </div>

      <Modal open={!!lightbox} onClose={() => setLightbox("")} title="Photo" wide>
        <img src={lightbox} alt="" className="max-h-[70vh] w-full rounded-2xl object-contain" />
      </Modal>
    </>
  );
}
