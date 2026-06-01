const { useState, useEffect, useCallback } = React;

// ── Supabase ──────────────────────────────────────────────────────────────────
const SUPA_URL = "https://fkidmerufuzzkuwjxpip.supabase.co";
const SUPA_KEY = "sb_publishable_Uw9QKoRL8xGNpaux3_FZTA_HqRmNXbK";
const supa = supabase.createClient(SUPA_URL, SUPA_KEY);

// ── Anthropic ─────────────────────────────────────────────────────────────────
const ANTHROPIC_KEY = ""; // Leave empty — user fills in via settings
const ANTH_URL = "https://lucky-pond-b23f.johnesmeijer.workers.dev";

// ── Sample data ───────────────────────────────────────────────────────────────
const SAMPLE_RECIPES = [
  {
    id: 1,
    title: "Spaghetti Carbonara",
    category: "Pasta", emoji: "🍝", time: "25 min", servings: 4,
    difficulty: "Gemakkelijk", color: "#E8C07D",
    description: "Klassieke Italiaanse pasta met ei, kaas en pancetta.",
    imageUrl: "https://loremflickr.com/600/400/pasta,carbonara?lock=1",
    sourceUrl: "",
    ingredients: [
      { amount: "400", unit: "g", name: "spaghetti" },
      { amount: "200", unit: "g", name: "pancetta" },
      { amount: "4", unit: "stuks", name: "eieren" },
      { amount: "100", unit: "g", name: "Parmezaanse kaas" },
      { amount: "2", unit: "teentjes", name: "knoflook" },
      { amount: "1", unit: "tl", name: "zwarte peper" },
    ],
    steps: [],
    sections: [
      { title: "Pasta koken", steps: [{ text: "Kook 400g spaghetti in gezouten water 8-10 min. Bewaar een kopje kookwater.", time: "10 min" }] },
      { title: "Pancetta bakken", steps: [{ text: "Bak 200g pancetta knapperig in droge pan. Voeg 2 knoflookteentjes toe.", time: "5 min" }] },
      { title: "Afmaken", steps: [
        { text: "Klop 4 eieren met 100g kaas en peper.", time: "2 min" },
        { text: "Haal pan van vuur, voeg pasta toe, giet ei-mengsel erover en roer met kookwater tot romig.", time: "3 min" },
      ]},
    ],
  },
];

const CATEGORIES = ["Alle", "Pasta", "Ontbijt", "Soep", "Vlees", "Vegetarisch", "Dessert", "Snack"];
const CAT_COLORS = { Pasta: "#E8C07D", Ontbijt: "#7CB87C", Soep: "#87CEEB", Vlees: "#CD8B8B", Vegetarisch: "#98D4A3", Dessert: "#DDA0DD", Snack: "#F4A460" };
const DEFAULT_PANTRY = ["zout", "peper", "olijfolie", "boter", "suiker", "bloem", "olie", "knoflook", "ui"];

function fetchFoodPhoto(query) {
  const kw = encodeURIComponent((query || "food").replace(/\s+/g, ","));
  return `https://loremflickr.com/600/400/${kw},food?lock=${Math.floor(Math.random() * 9999)}`;
}

// ── DB helpers ────────────────────────────────────────────────────────────────
async function dbLoadRecipes() {
  const { data, error } = await supa.from("recipes").select("*").order("created_at", { ascending: false });
  if (error) throw error;
  return data.map(r => r.data);
}
async function dbSaveRecipe(recipe) {
  const { error } = await supa.from("recipes").upsert({ id: recipe.id, data: recipe });
  if (error) throw error;
}
async function dbDeleteRecipe(id) {
  const { error } = await supa.from("recipes").delete().eq("id", id);
  if (error) throw error;
}
async function dbLoadShopping() {
  const { data, error } = await supa.from("shopping_list").select("*");
  if (error) throw error;
  return data.map(r => r.data);
}
async function dbSaveShopping(items) {
  await supa.from("shopping_list").delete().neq("id", "___never___");
  if (items.length === 0) return;
  const rows = items.map(i => ({ id: String(i.id), data: i }));
  const { error } = await supa.from("shopping_list").upsert(rows);
  if (error) throw error;
}
async function dbLoadPantry() {
  const { data, error } = await supa.from("pantry").select("*").eq("id", 1).maybeSingle();
  if (error && error.code !== "PGRST116") throw error;
  return data ? data.items : DEFAULT_PANTRY;
}
async function dbSavePantry(items) {
  const { error } = await supa.from("pantry").upsert({ id: 1, items });
  if (error) throw error;
}

// ── Main App ──────────────────────────────────────────────────────────────────


const STYLES = `
  @import url('https://fonts.googleapis.com/css2?family=Caveat:wght@400;600;700&family=Lora:ital,wght@0,400;0,600;1,400&display=swap');
  * { box-sizing:border-box; margin:0; padding:0; -webkit-tap-highlight-color:transparent; }
  body { background:#F9F5EC; overscroll-behavior:none; }
  #root { min-height:100vh; max-width:480px; margin:0 auto; }
  input,textarea,select,button { font-family:'Caveat',cursive; }
  .lined { background-image:repeating-linear-gradient(transparent,transparent 27px,#D4C5A966 28px); background-size:100% 28px; }
  .card-shadow { box-shadow:2px 3px 0 #C4B89A, 4px 5px 0 #A0896A33; }
  .tape { position:absolute; top:-5px; left:50%; transform:translateX(-50%) rotate(-1deg); width:50px; height:16px; background:rgba(255,230,150,0.72); border:1px solid rgba(200,180,100,0.35); z-index:3; border-radius:1px; }
  .fold { position:absolute; bottom:0; right:0; width:0; height:0; border-style:solid; border-width:0 0 14px 14px; border-color:transparent transparent #C4B89A transparent; }
  .btn-primary { background:#8B3A1A; color:#FFFEF8; border:2px solid #5A2010; border-radius:4px; padding:13px; font-size:20px; font-weight:600; cursor:pointer; box-shadow:2px 3px 0 #3A1008; width:100%; }
  .btn-amber { background:#C4873A; color:#FFFEF8; border:2px solid #8B5A1A; border-radius:4px; padding:13px; font-size:20px; font-weight:600; cursor:pointer; box-shadow:2px 3px 0 #6B3E10; width:100%; }
  .btn-ghost { background:#F0E6CC; color:#5A3A1A; border:2px solid #C4B89A; border-radius:4px; padding:11px; font-size:18px; cursor:pointer; box-shadow:2px 2px 0 #C4B89A; }
  .tag { background:#F0E6CC; border:1px solid #C4B89A; border-radius:3px; padding:2px 8px; font-size:13px; color:#6B4E2A; display:inline-block; }
  .section-bar { display:flex; align-items:center; gap:8px; margin:12px 0 8px; }
  .section-bar::before,.section-bar::after { content:''; flex:1; height:1px; background:#C4B89A; }
  .section-bar span { font-size:15px; font-weight:600; white-space:nowrap; background:#C4873A; color:#FFFEF8; padding:3px 12px; border-radius:20px; }
  .step-card { display:flex; gap:12px; margin-bottom:10px; padding:10px 12px; background:#FFFEF8; border-left:4px solid #C4873A; border-radius:0 4px 4px 0; box-shadow:2px 2px 0 #E8DFC8; }
  .step-num { width:28px; height:28px; background:#C4873A; border-radius:50%; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:14px; color:#FFFEF8; flex-shrink:0; }
`;

function App() {

  const [recipes, setRecipes] = useState([]);
  const [shoppingList, setShoppingList] = useState([]);
  const [pantry, setPantry] = useState(DEFAULT_PANTRY);
  const [checkedItems, setCheckedItems] = useState({});
  const [dbLoaded, setDbLoaded] = useState(false);
  const [dbError, setDbError] = useState("");

  const [view, setView] = useState("home");
  const [selectedRecipe, setSelectedRecipe] = useState(null);
  const [activeCategory, setActiveCategory] = useState("Alle");
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState("ingredienten");
  const [cookStep, setCookStep] = useState(0);

  const [aiUrl, setAiUrl] = useState("");
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState("");
  const [suggestions, setSuggestions] = useState([]);
  const [selectedSuggestions, setSelectedSuggestions] = useState(new Set());
  const [showSuggestions, setShowSuggestions] = useState(false);

  const [notification, setNotification] = useState("");
  const [editingIngredients, setEditingIngredients] = useState(false);
  const [selectedIngredients, setSelectedIngredients] = useState({});
  const [showPhotoPanel, setShowPhotoPanel] = useState(false);
  const [manualPhotoUrl, setManualPhotoUrl] = useState("");
  const [pantryInput, setPantryInput] = useState("");
  const [adHocInput, setAdHocInput] = useState("");
  const [addForm, setAddForm] = useState({ title: "", category: "Pasta", emoji: "🍽️", time: "", servings: 2, difficulty: "Gemakkelijk", description: "", color: "#E8C07D", sourceUrl: "", ingredients: [{ amount: "", unit: "", name: "" }], steps: [{ text: "", time: "" }] });

  // ── Load from Supabase ──
  useEffect(() => {
    async function load() {
      try {
        const [r, s, p] = await Promise.all([dbLoadRecipes(), dbLoadShopping(), dbLoadPantry()]);
        setRecipes(r.length > 0 ? r : SAMPLE_RECIPES);
        setShoppingList(s);
        setPantry(p);
        if (r.length === 0) {
          for (const rec of SAMPLE_RECIPES) await dbSaveRecipe(rec);
        }
      } catch (e) {
        setDbError(e.message);
        setRecipes(SAMPLE_RECIPES);
      }
      setDbLoaded(true);
    }
    load();
  }, []);

  const showNotif = (msg) => { setNotification(msg); setTimeout(() => setNotification(""), 2800); };

  // ── Recipe CRUD ──
  const addRecipe = async (recipe) => {
    setRecipes(prev => [recipe, ...prev]);
    try { await dbSaveRecipe(recipe); } catch (e) { showNotif("⚠️ Opslaan mislukt: " + e.message); }
  };
  const updateRecipe = async (recipe) => {
    setRecipes(prev => prev.map(r => r.id === recipe.id ? recipe : r));
    setSelectedRecipe(recipe);
    try { await dbSaveRecipe(recipe); } catch (e) { showNotif("⚠️ Opslaan mislukt"); }
  };
  const deleteRecipe = async (id) => {
    setRecipes(prev => prev.filter(r => r.id !== id));
    setView("home");
    showNotif("🗑️ Recept verwijderd");
    try { await dbDeleteRecipe(id); } catch (e) {}
  };
  const updateIngredients = (recipe, newIngredients) => {
    updateRecipe({ ...recipe, ingredients: newIngredients });
  };
  const setPhotoForRecipe = (recipe, imageUrl) => {
    updateRecipe({ ...recipe, imageUrl });
  };

  // ── Shopping ──
  const saveShoppingList = async (list) => {
    setShoppingList(list);
    try { await dbSaveShopping(list); } catch (e) {}
  };
  const addToShoppingList = (recipe) => {
    const anySelected = Object.values(selectedIngredients).some(v => v);
    const toAdd = recipe.ingredients.filter((ing, i) => {
      const key = recipe.id + "-" + i;
      const inPantry = pantry.some(p => ing.name.toLowerCase().includes(p.toLowerCase()));
      if (anySelected) return selectedIngredients[key];
      return !inPantry;
    });
    const newItems = toAdd.map(ing => ({ ...ing, recipe: recipe.title, id: Date.now() + Math.random() }));
    const updated = [...shoppingList, ...newItems];
    saveShoppingList(updated);
    setSelectedIngredients({});
    showNotif(`✅ ${newItems.length} ingrediënten toegevoegd!`);
  };

  // ── Pantry ──
  const savePantry = async (items) => {
    setPantry(items);
    try { await dbSavePantry(items); } catch (e) {}
  };

  // ── AI import ──
  const fetchWithAI = async () => {
    if (!aiUrl.trim()) return;
    setAiLoading(true);
    setAiError("");
    setSuggestions([]);
    setShowSuggestions(false);
    const isUrl = aiUrl.trim().startsWith("http");

    const suggestionsSchema = '[{"title":"Recept naam","source":"website.nl","rating":"4.8","reviews":"1200","time":"30 min","difficulty":"Makkelijk","emoji":"🍝","description":"korte omschrijving","color":"#E8C07D"}]';
    const recipeSchema = '{"title":"string","category":"Pasta|Ontbijt|Soep|Vlees|Vegetarisch|Dessert|Snack","emoji":"emoji","time":"X min","servings":4,"difficulty":"Makkelijk|Gemiddeld|Moeilijk","color":"#hexkleur","description":"Nederlandse omschrijving","ingredients":[{"amount":"string","unit":"string","name":"string"}],"steps":[],"sections":[{"title":"bereidingsnaam","steps":[{"text":"stap met exacte hoeveelheden","time":"X min"}]}],"sourceUrl":"","imageQuery":"Engelse zoekwoorden voor foto"}';

    const headers = {
      "Content-Type": "application/json",
    };

    try {
      // Step 1: get 5 suggestions
      const suggestPrompt = isUrl
        ? 'Geef 1 recept van deze URL als JSON array. Begin met [ eindig met ]. Geen andere tekst. Schema: ' + suggestionsSchema + '. URL: ' + aiUrl
        : 'Geef een JSON array met 5 recepten voor "' + aiUrl + '". Begin met [ eindig met ]. Geen andere tekst. Schema: ' + suggestionsSchema;

      let suggestText = "";
      if (isUrl) {
        let messages = [{ role: "user", content: suggestPrompt }];
        for (let i = 0; i < 5; i++) {
          const res = await fetch(ANTH_URL, {
            method: "POST", headers,
            body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, tools: [{ type: "web_search_20250305", name: "web_search" }], messages }),
          });
          const data = await res.json();
          if (!res.ok) throw new Error(data.error?.message || "HTTP " + res.status);
          const texts = (data.content || []).filter(b => b.type === "text").map(b => b.text);
          if (texts.length) suggestText = texts.join("");
          if (data.stop_reason === "end_turn") break;
          if (data.stop_reason === "tool_use") {
            messages = [...messages, { role: "assistant", content: data.content }];
            const results = (data.content || []).filter(b => b.type === "tool_use").map(b => ({ type: "tool_result", tool_use_id: b.id, content: "Verwerk de resultaten en geef de receptenlijst als JSON." }));
            messages = [...messages, { role: "user", content: results }];
          } else break;
        }
      } else {
        const res = await fetch(ANTH_URL, {
          method: "POST", headers,
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 1000, messages: [{ role: "user", content: suggestPrompt }] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "HTTP " + res.status);
        suggestText = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
      }

      if (!suggestText) throw new Error("Leeg antwoord van Worker");
      const match = suggestText.match(/\[[\s\S]*\]/);
      if (!match) throw new Error("Antwoord was: " + suggestText.slice(0, 200));
      const items = JSON.parse(match[0]);
      if (!items.length) throw new Error("Lege lijst ontvangen");
      setSuggestions(items.map((s, i) => ({ ...s, id: i, imageUrl: fetchFoodPhoto(s.imageQuery || s.title) })));
      setShowSuggestions(true);

    } catch (e) {
      setAiError(e.message);
    }
    setAiLoading(false);
  };

  const importSelectedRecipes = async () => {
    if (selectedSuggestions.size === 0) return;
    setAiLoading(true);
    setAiError("");

    const headers = {
      "Content-Type": "application/json",
    };

    const recipeSchema = '{"title":"string","category":"Pasta|Ontbijt|Soep|Vlees|Vegetarisch|Dessert|Snack","emoji":"emoji","time":"X min","servings":4,"difficulty":"Makkelijk|Gemiddeld|Moeilijk","color":"#hexkleur","description":"Nederlandse omschrijving","ingredients":[{"amount":"string","unit":"string","name":"string"}],"steps":[],"sections":[{"title":"bereidingsnaam","steps":[{"text":"stap met exacte hoeveelheden","time":"X min"}]}],"sourceUrl":"","imageQuery":"Engelse zoekwoorden voor foto"}';

    let saved = 0;
    for (const idx of selectedSuggestions) {
      const s = suggestions[idx];
      try {
        const prompt = 'Maak een volledig gedetailleerd recept voor "' + s.title + '" van ' + (s.source || 'een bekende kooksite') + '. Geef ALLEEN dit JSON terug, geen markdown: ' + recipeSchema;
        const res = await fetch(ANTH_URL, {
          method: "POST", headers,
          body: JSON.stringify({ model: "claude-sonnet-4-6", max_tokens: 2000, messages: [{ role: "user", content: prompt }] }),
        });
        const data = await res.json();
        if (!res.ok) throw new Error(data.error?.message || "HTTP " + res.status);
        const text = (data.content || []).filter(b => b.type === "text").map(b => b.text).join("");
        const match = text.match(/\{[\s\S]*\}/);
        if (!match) continue;
        const recipe = JSON.parse(match[0]);
        if (!recipe.title) continue;
        recipe.imageUrl = fetchFoodPhoto(recipe.imageQuery || recipe.title);
        recipe.id = Date.now() + Math.random();
        await addRecipe(recipe);
        saved++;
      } catch(e) { console.error(e); }
    }

    setShowSuggestions(false);
    setSuggestions([]);
    setSelectedSuggestions(new Set());
    setAiUrl("");
    setView("home");
    showNotif(saved + ' recept' + (saved > 1 ? 'en' : '') + ' opgeslagen!');
    setAiLoading(false);
  };;

  const saveManualRecipe = async () => {
    if (!addForm.title.trim()) return;
    const recipe = { ...addForm, id: Date.now(), sections: addForm.steps.length ? [{ title: null, steps: addForm.steps }] : [], imageUrl: fetchFoodPhoto(addForm.title) };
    await addRecipe(recipe);
    setView("home");
    showNotif('🎉 "' + recipe.title + '" toegevoegd!');
  };

  const filtered = recipes.filter(r => (activeCategory === "Alle" || r.category === activeCategory) && r.title.toLowerCase().includes(search.toLowerCase()));

  // ── Loading screen ──


  const handwrittenStyle = {fontFamily:"'Caveat',cursive"};
  const lora = {fontFamily:"'Lora',serif"};
  const parchment = {background:"#F9F5EC"};
  const cream = {background:"#FFFEF8"};
  const darkBrown = {background:"#2C1A0E"};

  const allSteps = (recipe) => recipe.sections?.length ? recipe.sections.flatMap(s => s.steps) : (recipe.steps || []);

  if (!dbLoaded) return (
    <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",minHeight:"100vh",...parchment,gap:16,...handwrittenStyle}}>
      <div style={{fontSize:56}}>📖</div>
      <div style={{fontSize:22,color:"#8B6A3E"}}>Kookboek laden...</div>
    </div>
  );

  return (
    <div style={{...handwrittenStyle,minHeight:"100vh",...parchment,color:"#2C1A0E"}}>
      <style>{STYLES}</style>

      {notification && (
        <div style={{position:"fixed",top:20,left:"50%",transform:"translateX(-50%)",background:"#2C1A0E",color:"#F9F5EC",padding:"10px 24px",borderRadius:30,zIndex:9999,fontSize:18,boxShadow:"0 4px 20px rgba(0,0,0,0.3)",whiteSpace:"nowrap",pointerEvents:"none"}}>
          {notification}
        </div>
      )}

      {dbError && <div style={{background:"#FFE8E8",color:"#C0392B",padding:"10px 20px",fontSize:14,textAlign:"center",...lora}}>⚠️ {dbError}</div>}

      {/* HOME */}
      {view === "home" && (
        <div>
          {/* Cover */}
          <div style={{background:"#2C1A0E",minHeight:220,position:"relative",overflow:"hidden",display:"flex",flexDirection:"column",justifyContent:"flex-end",padding:"24px 20px 20px"}}>
            <div style={{position:"absolute",top:0,left:0,right:0,height:8,background:"repeating-linear-gradient(90deg,#C4873A 0,#C4873A 12px,#8B3A1A 12px,#8B3A1A 24px)"}} />
            <div style={{position:"absolute",top:20,right:16,fontSize:72,opacity:0.12}}>📖</div>
            <div style={{...lora,fontSize:11,letterSpacing:3,color:"#C4873A",textTransform:"uppercase",marginBottom:6}}>Mijn persoonlijke</div>
            <div style={{fontSize:48,fontWeight:700,color:"#F9F5EC",lineHeight:1}}>Kookboek</div>
            <div style={{fontSize:16,color:"#8B7355",marginTop:6}}>✍ {recipes.length} recepten verzameld</div>
          </div>

          {/* Search + actions */}
          <div style={{padding:"12px 14px",background:"#EDE5D0",borderBottom:"2px solid #C4B89A",display:"flex",gap:8}}>
            <div style={{flex:1,position:"relative"}}>
              <span style={{position:"absolute",left:10,top:"50%",transform:"translateY(-50%)",opacity:0.5}}>🔍</span>
              <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Zoek recept..." style={{width:"100%",padding:"8px 10px 8px 32px",background:"transparent",border:"none",borderBottom:"2px dashed #A0896A",fontSize:20,color:"#2C1A0E",outline:"none",boxSizing:"border-box"}} />
            </div>
            <button onClick={()=>setView("add")} style={{background:"#C4873A",border:"2px solid #8B5A1A",color:"#FFFEF8",borderRadius:4,padding:"0 14px",fontSize:24,cursor:"pointer",boxShadow:"2px 2px 0 #6B3E10"}}>+</button>
            <button onClick={()=>setView("shop")} style={{background:shoppingList.length>0?"#8B3A1A":"#D4C5A9",border:"2px solid",borderColor:shoppingList.length>0?"#5A2010":"#B4A58A",color:shoppingList.length>0?"#FFFEF8":"#5A3A1A",borderRadius:4,padding:"0 12px",fontSize:20,cursor:"pointer",position:"relative",boxShadow:"2px 2px 0 rgba(0,0,0,0.2)"}}>
              🛒{shoppingList.filter(i=>!checkedItems[i.id]).length>0&&<span style={{position:"absolute",top:2,right:2,background:"#C4873A",color:"#fff",borderRadius:"50%",width:16,height:16,fontSize:10,display:"flex",alignItems:"center",justifyContent:"center"}}>{shoppingList.filter(i=>!checkedItems[i.id]).length}</span>}
            </button>
          </div>

          {/* Category tabs */}
          <div style={{display:"flex",padding:"8px 14px 0",gap:4,background:"#EDE5D0",borderBottom:"2px solid #C4B89A",overflowX:"auto",scrollbarWidth:"none"}}>
            {CATEGORIES.map(cat=>(
              <button key={cat} onClick={()=>setActiveCategory(cat)} style={{whiteSpace:"nowrap",padding:"5px 12px 7px",background:"none",border:"none",borderBottom:activeCategory===cat?"3px solid #C4873A":"3px solid transparent",fontSize:17,color:activeCategory===cat?"#2C1A0E":"#8B6A3E",cursor:"pointer",fontFamily:"'Caveat',cursive"}}>
                {cat}
              </button>
            ))}
          </div>

          {/* Recipe grid */}
          <div style={{padding:"12px 14px 90px"}}>
            {filtered.length===0&&<div style={{textAlign:"center",padding:"60px 0",opacity:0.4}}><div style={{fontSize:48}}>🍽️</div><div style={{marginTop:12,fontSize:18}}>Geen recepten gevonden</div></div>}
            <div style={{...lora,fontStyle:"italic",fontSize:13,color:"#8B6A3E",marginBottom:10}}>Recepten van mijn kookboek ↓</div>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:14}}>
              {filtered.map((recipe,ri)=>(
                <div key={recipe.id} onClick={()=>{setSelectedRecipe(recipe);setActiveTab("ingredienten");setEditingIngredients(false);setShowPhotoPanel(false);setView("detail");}}
                  className="card-shadow" style={{borderRadius:4,overflow:"visible",cursor:"pointer",background:"#FFFEF8",border:"1px solid #D4C5A9",transform:`rotate(${ri%2===0?"-0.4":"0.5"}deg)`,transition:"transform 0.15s",position:"relative"}}>
                  <div className="tape" />
                  <div style={{height:100,background:`linear-gradient(135deg,${recipe.color}CC,${recipe.color}66)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:42,position:"relative",overflow:"hidden"}}>
                    {recipe.imageUrl&&<img src={recipe.imageUrl} alt={recipe.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.88}} onError={e=>{e.target.style.display="none"}} />}
                    <span style={{position:"relative",zIndex:1,filter:recipe.imageUrl?"drop-shadow(0 2px 4px rgba(0,0,0,0.4))":"none"}}>{recipe.emoji}</span>
                    <div style={{position:"absolute",top:6,right:8,background:"rgba(0,0,0,0.35)",color:"#fff",borderRadius:3,padding:"1px 6px",fontSize:11,zIndex:2,fontFamily:"'Caveat',cursive"}}>{recipe.time}</div>
                  </div>
                  <div className="lined" style={{padding:"8px 10px 12px"}}>
                    <div style={{fontWeight:700,fontSize:15,lineHeight:1.2,marginBottom:4}}>{recipe.title}</div>
                    <div style={{display:"flex",gap:6,alignItems:"center"}}>
                      <span className="tag">{recipe.category}</span>
                      <span style={{fontSize:12,opacity:0.5,...lora,fontStyle:"italic"}}>{recipe.ingredients.length} ing.</span>
                    </div>
                  </div>
                  <div className="fold" />
                </div>
              ))}
            </div>
            <div style={{textAlign:"center",marginTop:24,...lora,fontStyle:"italic",fontSize:14,color:"#A0896A",lineHeight:1.8}}>"Koken is liefde die je kunt proeven ♥"</div>
          </div>
        </div>
      )}

      {/* DETAIL */}
      {view==="detail"&&selectedRecipe&&(
        <div style={{paddingBottom:80}}>
          <div style={{height:220,background:`linear-gradient(135deg,${selectedRecipe.color}DD,${selectedRecipe.color}88)`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:80,position:"relative",overflow:"hidden"}}>
            {selectedRecipe.imageUrl&&<img src={selectedRecipe.imageUrl} alt={selectedRecipe.title} style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.82}} onError={e=>{e.target.style.display="none"}} />}
            <div style={{position:"absolute",inset:0,background:"linear-gradient(to bottom,transparent 50%,rgba(249,245,236,0.5) 100%)"}} />
            <span style={{position:"relative",zIndex:1,filter:"drop-shadow(0 4px 8px rgba(0,0,0,0.4))"}}>{selectedRecipe.emoji}</span>
            <button onClick={()=>setView("home")} style={{position:"absolute",top:16,left:14,background:"rgba(255,254,248,0.9)",border:"1px solid #C4B89A",borderRadius:4,padding:"6px 12px",fontSize:16,cursor:"pointer",zIndex:2,fontFamily:"'Caveat',cursive"}}>← Terug</button>
            <div style={{position:"absolute",top:14,right:14,display:"flex",gap:6,zIndex:2}}>
              <button onClick={()=>{setShowPhotoPanel(p=>!p);setManualPhotoUrl("");}} style={{background:"rgba(255,254,248,0.9)",border:"1px solid #C4B89A",borderRadius:4,padding:"6px 10px",fontSize:16,cursor:"pointer"}}>📸</button>
              <button onClick={()=>deleteRecipe(selectedRecipe.id)} style={{background:"rgba(255,254,248,0.9)",border:"1px solid #C4B89A",borderRadius:4,padding:"6px 10px",fontSize:16,cursor:"pointer"}}>🗑️</button>
            </div>
          </div>

          {showPhotoPanel&&(
            <div style={{background:"#EDE5D0",borderBottom:"2px solid #C4B89A",padding:14}}>
              <div style={{fontWeight:600,fontSize:16,marginBottom:8}}>📸 Foto wijzigen</div>
              <label style={{display:"flex",alignItems:"center",gap:8,padding:"10px 12px",border:"2px dashed #C4B89A",borderRadius:4,cursor:"pointer",marginBottom:8,fontSize:16,color:"#8B6A3E"}}>
                📁 Kies foto van apparaat
                <input type="file" accept="image/*" style={{display:"none"}} onChange={e=>{const file=e.target.files?.[0];if(!file)return;const reader=new FileReader();reader.onload=ev=>{setPhotoForRecipe(selectedRecipe,ev.target.result);setShowPhotoPanel(false);showNotif("✅ Foto toegevoegd!");};reader.readAsDataURL(file);}} />
              </label>
              <div style={{display:"flex",gap:8,marginBottom:8}}>
                <input value={manualPhotoUrl} onChange={e=>setManualPhotoUrl(e.target.value)} placeholder="Of plak een foto-URL..." style={{flex:1,padding:"8px 10px",border:"2px dashed #C4B89A",borderRadius:4,fontSize:16,outline:"none",background:"transparent"}} />
                <button onClick={()=>{if(manualPhotoUrl.trim()){setPhotoForRecipe(selectedRecipe,manualPhotoUrl.trim());setShowPhotoPanel(false);showNotif("✅ Foto toegevoegd!");}}} className="btn-ghost" style={{padding:"8px 14px",fontSize:16}}>OK</button>
              </div>
              <button onClick={()=>{setPhotoForRecipe(selectedRecipe,fetchFoodPhoto(selectedRecipe.imageQuery||selectedRecipe.title));setShowPhotoPanel(false);showNotif("📸 Foto vernieuwd!");}} className="btn-ghost" style={{width:"100%",fontSize:16}}>🔍 Automatisch zoeken</button>
            </div>
          )}

          <div style={{padding:"16px 16px 0"}} className="lined">
            <div style={{display:"flex",gap:6,flexWrap:"wrap",marginBottom:8}}>
              <span className="tag">⏱ {selectedRecipe.time}</span>
              <span className="tag">👥 {selectedRecipe.servings} pers.</span>
              <span className="tag">📊 {selectedRecipe.difficulty}</span>
            </div>
            <h2 style={{fontSize:32,fontWeight:700,lineHeight:1.1,marginBottom:6}}>{selectedRecipe.title}</h2>
            <p style={{marginBottom:10,opacity:0.65,fontSize:16,...lora,fontStyle:"italic",lineHeight:1.6}}>{selectedRecipe.description}</p>
            {selectedRecipe.sourceUrl&&<a href={selectedRecipe.sourceUrl} target="_blank" rel="noopener noreferrer" style={{display:"inline-flex",alignItems:"center",gap:4,marginBottom:14,fontSize:14,color:"#C4873A",textDecoration:"none",borderBottom:"1px dashed #C4873A",...lora,fontStyle:"italic"}}>🔗 Origineel recept</a>}
            {!selectedRecipe.sourceUrl&&<div style={{marginBottom:14}} />}

            <div style={{display:"flex",background:"#EDE5D0",borderRadius:4,padding:3,marginBottom:16,gap:3}}>
              {["ingredienten","stappen"].map(tab=>(
                <button key={tab} onClick={()=>setActiveTab(tab)} style={{flex:1,padding:"8px",border:"none",borderRadius:3,background:activeTab===tab?"#FFFEF8":"transparent",fontSize:17,fontWeight:activeTab===tab?700:400,cursor:"pointer",boxShadow:activeTab===tab?"2px 2px 0 #C4B89A":"none",fontFamily:"'Caveat',cursive",color:"#2C1A0E"}}>
                  {tab==="ingredienten"?"🛒 Ingrediënten":"👨‍🍳 Stappen"}
                </button>
              ))}
            </div>

            {activeTab==="ingredienten"&&(
              <div>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
                  <div style={{fontSize:14,opacity:0.5,...lora,fontStyle:"italic"}}>{editingIngredients?"Tik op een veld om te bewerken":"Tik aan wat je nodig hebt"}</div>
                  <button onClick={()=>setEditingIngredients(e=>!e)} style={{background:editingIngredients?"#C4873A":"#EDE5D0",border:"2px solid",borderColor:editingIngredients?"#8B5A1A":"#C4B89A",borderRadius:4,padding:"4px 12px",fontSize:15,fontWeight:600,cursor:"pointer",color:editingIngredients?"#FFFEF8":"#2C1A0E",fontFamily:"'Caveat',cursive"}}>
                    {editingIngredients?"✓ Klaar":"✏️ Bewerken"}
                  </button>
                </div>
                {selectedRecipe.ingredients.map((ing,i)=>{
                  const key=selectedRecipe.id+"-"+i;
                  const inPantry=!editingIngredients&&pantry.some(p=>ing.name.toLowerCase().includes(p.toLowerCase()));
                  const isSel=selectedIngredients[key];
                  return editingIngredients?(
                    <div key={i} style={{display:"flex",gap:5,marginBottom:6}}>
                      <input value={ing.amount} onChange={e=>{const u=[...selectedRecipe.ingredients];u[i]={...u[i],amount:e.target.value};updateIngredients(selectedRecipe,u);}} style={{width:52,padding:"7px 5px",border:"none",borderBottom:"2px dashed #C4B89A",background:"transparent",fontSize:17,fontWeight:700,outline:"none",textAlign:"center",color:"#8B3A1A"}} placeholder="hoev." />
                      <input value={ing.unit} onChange={e=>{const u=[...selectedRecipe.ingredients];u[i]={...u[i],unit:e.target.value};updateIngredients(selectedRecipe,u);}} style={{width:46,padding:"7px 4px",border:"none",borderBottom:"2px dashed #C4B89A",background:"transparent",fontSize:17,outline:"none",textAlign:"center"}} placeholder="enh." />
                      <input value={ing.name} onChange={e=>{const u=[...selectedRecipe.ingredients];u[i]={...u[i],name:e.target.value};updateIngredients(selectedRecipe,u);}} style={{flex:1,padding:"7px 8px",border:"none",borderBottom:"2px dashed #C4B89A",background:"transparent",fontSize:17,outline:"none"}} />
                      <button onClick={()=>updateIngredients(selectedRecipe,selectedRecipe.ingredients.filter((_,j)=>j!==i))} style={{width:30,height:36,background:"#FFE8E8",border:"1px solid #FFBBBB",borderRadius:4,fontSize:14,cursor:"pointer",color:"#C0392B"}}>✕</button>
                    </div>
                  ):(
                    <div key={i} onClick={()=>!inPantry&&setSelectedIngredients(prev=>({...prev,[key]:!prev[key]}))}
                      style={{display:"flex",alignItems:"center",padding:"9px 8px",marginBottom:3,borderRadius:3,border:"1px solid",borderColor:inPantry?"#E8DDD0":isSel?"#C4873A":"#E8DDD0",background:inPantry?"#FAFAF6":isSel?"#FFF3E0":"#FFFEF8",cursor:inPantry?"default":"pointer"}}>
                      <div style={{width:20,height:20,borderRadius:3,border:"2px solid",borderColor:inPantry?"#D0C4B0":isSel?"#C4873A":"#D0C4B0",background:isSel?"#C4873A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,color:"#FFFEF8",marginRight:10,flexShrink:0}}>
                        {inPantry?"🏠":isSel?"✓":""}
                      </div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:17,fontWeight:500,opacity:inPantry?0.4:1}}>{ing.name}</div>
                        {inPantry&&<div style={{fontSize:13,color:"#8B6A3E",...lora,fontStyle:"italic"}}>Op voorraad</div>}
                      </div>
                      <div style={{fontSize:16,fontWeight:700,color:inPantry?"#C0B4A0":"#8B3A1A"}}>{ing.amount} {ing.unit}</div>
                    </div>
                  );
                })}
                {editingIngredients&&(
                  <button onClick={()=>updateIngredients(selectedRecipe,[...selectedRecipe.ingredients,{amount:"",unit:"",name:""}])} style={{width:"100%",marginTop:6,padding:"9px",background:"transparent",border:"2px dashed #C4B89A",borderRadius:4,fontSize:16,color:"#8B6A3E",cursor:"pointer"}}>+ Ingrediënt toevoegen</button>
                )}
                {!editingIngredients&&(
                  <div style={{display:"flex",gap:8,marginTop:14}}>
                    <button onClick={()=>addToShoppingList(selectedRecipe)} className="btn-primary" style={{flex:1,fontSize:18}}>🛒 Voeg toe aan lijst</button>
                    <button onClick={()=>setView("pantry")} className="btn-ghost" style={{padding:"13px 16px",fontSize:18}}>🏠</button>
                  </div>
                )}
              </div>
            )}

            {activeTab==="stappen"&&(
              <div>
                {(()=>{
                  const sections=selectedRecipe.sections?.length?selectedRecipe.sections:[{title:null,steps:selectedRecipe.steps||[]}];
                  let n=0;
                  return sections.map((sec,si)=>(
                    <div key={si} style={{marginBottom:20}}>
                      {sec.title&&<div className="section-bar"><span>{sec.title}</span></div>}
                      {sec.steps.map((step,i)=>{n++;const num=n;return(
                        <div key={i} className="step-card">
                          <div className="step-num">{num}</div>
                          <div style={{flex:1}}>
                            <div style={{fontSize:16,lineHeight:1.7,...lora}}>{step.text}</div>
                            {step.time&&<div style={{marginTop:4,fontSize:14,color:"#8B6A3E",display:"inline-block",background:"#F0E6CC",padding:"1px 8px",borderRadius:3}}>⏱ {step.time}</div>}
                          </div>
                        </div>
                      );})};
                    </div>
                  ));
                })()}
                <button onClick={()=>{setCookStep(0);setView("cook");}} className="btn-amber" style={{marginTop:4,fontSize:20}}>👨‍🍳 Start kookmodus</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* COOK MODE */}
      {view==="cook"&&selectedRecipe&&(()=>{
        const steps=allSteps(selectedRecipe);
        return(
          <div style={{minHeight:"100vh",background:"#2C1A0E",color:"#F9F5EC"}}>
            <div style={{padding:"48px 18px 24px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:28}}>
                <button onClick={()=>setView("detail")} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#F9F5EC",padding:"8px 14px",borderRadius:4,cursor:"pointer",fontSize:16,fontFamily:"'Caveat',cursive"}}>← Stop</button>
                <div style={{fontSize:15,opacity:0.5,...lora,fontStyle:"italic"}}>Stap {cookStep+1} van {steps.length}</div>
              </div>
              <div style={{height:4,background:"rgba(255,255,255,0.12)",borderRadius:2,marginBottom:40}}>
                <div style={{height:"100%",background:"#C4873A",borderRadius:2,width:`${((cookStep+1)/steps.length)*100}%`,transition:"width 0.4s"}} />
              </div>
              <div style={{textAlign:"center",marginBottom:48}}>
                <div style={{fontSize:72,marginBottom:16}}>{selectedRecipe.emoji}</div>
                <div style={{fontSize:20,lineHeight:1.8,...lora,padding:"0 8px"}}>{steps[cookStep]?.text}</div>
                {steps[cookStep]?.time&&<div style={{marginTop:14,display:"inline-block",background:"rgba(196,135,58,0.2)",border:"1px solid #C4873A",padding:"5px 18px",borderRadius:20,fontSize:16,color:"#C4873A",fontFamily:"'Caveat',cursive"}}>⏱ {steps[cookStep].time}</div>}
              </div>
              <div style={{display:"flex",gap:12}}>
                {cookStep>0&&<button onClick={()=>setCookStep(s=>s-1)} style={{flex:1,padding:"14px",background:"rgba(255,255,255,0.1)",color:"#F9F5EC",border:"none",borderRadius:4,fontSize:18,cursor:"pointer",fontFamily:"'Caveat',cursive"}}>← Vorige</button>}
                {cookStep<steps.length-1
                  ?<button onClick={()=>setCookStep(s=>s+1)} className="btn-amber" style={{flex:2,fontSize:19}}>Volgende →</button>
                  :<button onClick={()=>{setView("home");showNotif("🎉 Smakelijk eten!");}} style={{flex:2,padding:"14px",background:"#7CB87C",color:"#fff",border:"none",borderRadius:4,fontSize:19,cursor:"pointer",fontFamily:"'Caveat',cursive"}}>🎉 Klaar! Smakelijk!</button>}
              </div>
            </div>
          </div>
        );
      })()}

      {/* SHOPPING */}
      {view==="shop"&&(
        <div style={{paddingBottom:80}}>
          <div style={{background:"#2C1A0E",padding:"48px 18px 20px",color:"#F9F5EC"}}>
            <button onClick={()=>setView("home")} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#F9F5EC",padding:"8px 14px",borderRadius:4,cursor:"pointer",marginBottom:14,fontSize:16,fontFamily:"'Caveat',cursive"}}>← Terug</button>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-end"}}>
              <div>
                <h2 style={{fontSize:32,fontWeight:700}}>Boodschappenlijst</h2>
                <div style={{opacity:0.6,fontSize:16,marginTop:4,...lora,fontStyle:"italic"}}>{shoppingList.filter(i=>!checkedItems[i.id]).length} items te kopen</div>
              </div>
              <button onClick={()=>setView("pantry")} style={{background:"rgba(255,255,255,0.12)",border:"none",color:"#F9F5EC",padding:"8px 12px",borderRadius:4,fontSize:15,cursor:"pointer",fontFamily:"'Caveat',cursive"}}>🏠 Voorraad</button>
            </div>
          </div>
          <div style={{padding:"14px 16px"}} className="lined">
            <div style={{display:"flex",gap:8,marginBottom:14}}>
              <input value={adHocInput} onChange={e=>setAdHocInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&adHocInput.trim()){saveShoppingList([...shoppingList,{name:adHocInput.trim(),amount:"",unit:"",recipe:"Eigen toevoeging",id:Date.now()}]);setAdHocInput("");}}} placeholder="Extra item toevoegen..." style={{flex:1,padding:"8px 10px",background:"transparent",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:20,outline:"none"}} />
              <button onClick={()=>{if(adHocInput.trim()){saveShoppingList([...shoppingList,{name:adHocInput.trim(),amount:"",unit:"",recipe:"Eigen toevoeging",id:Date.now()}]);setAdHocInput("");}}} style={{background:"#C4873A",border:"2px solid #8B5A1A",color:"#FFFEF8",borderRadius:4,padding:"0 14px",fontSize:22,cursor:"pointer",boxShadow:"2px 2px 0 #6B3E10"}}>+</button>
            </div>
            {shoppingList.length===0
              ?<div style={{textAlign:"center",padding:"60px 0",opacity:0.4}}><div style={{fontSize:48}}>🛒</div><div style={{marginTop:12,fontSize:18}}>Voeg ingrediënten toe vanuit een recept</div></div>
              :<>
                {shoppingList.map(item=>(
                  <div key={item.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:"1px dashed #D4C5A9"}}>
                    <div onClick={()=>setCheckedItems(prev=>({...prev,[item.id]:!prev[item.id]}))} style={{width:22,height:22,borderRadius:3,border:"2px solid",borderColor:checkedItems[item.id]?"#C4873A":"#C4B89A",background:checkedItems[item.id]?"#C4873A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",color:"#FFFEF8",fontSize:13,flexShrink:0,cursor:"pointer"}}>
                      {checkedItems[item.id]?"✓":""}
                    </div>
                    <div style={{flex:1,opacity:checkedItems[item.id]?0.4:1}}>
                      <div style={{fontSize:18,textDecoration:checkedItems[item.id]?"line-through":"none"}}>{item.name}</div>
                      <div style={{fontSize:13,opacity:0.5,...lora,fontStyle:"italic"}}>{item.recipe}</div>
                    </div>
                    <div style={{fontWeight:700,fontSize:16,opacity:checkedItems[item.id]?0.4:1,color:"#8B3A1A"}}>{item.amount} {item.unit}</div>
                    <div onClick={()=>saveShoppingList(shoppingList.filter(i=>i.id!==item.id))} style={{opacity:0.3,cursor:"pointer",fontSize:16}}>✕</div>
                  </div>
                ))}
                <div style={{display:"flex",gap:10,marginTop:18}}>
                  <button onClick={()=>{const t=shoppingList.filter(i=>!checkedItems[i.id]).map(i=>(i.amount+" "+i.unit+" "+i.name).trim()).join("\n");navigator.clipboard?.writeText(t);showNotif("📋 Gekopieerd!");}} className="btn-amber" style={{flex:1,fontSize:18}}>📋 Kopieer</button>
                  <button onClick={()=>{saveShoppingList([]);setCheckedItems({});}} className="btn-ghost" style={{fontSize:17}}>Leeg</button>
                </div>
                <div style={{marginTop:10,padding:"8px 12px",background:"#F0E6CC",border:"1px dashed #C4B89A",borderRadius:3,fontSize:14,color:"#8B6A3E",...lora,fontStyle:"italic"}}>💡 Kopieer en plak in de AH app of WhatsApp</div>
              </>
            }
          </div>
        </div>
      )}

      {/* PANTRY */}
      {view==="pantry"&&(
        <div style={{paddingBottom:80}}>
          <div style={{background:"#2C1A0E",padding:"48px 18px 20px",color:"#F9F5EC"}}>
            <button onClick={()=>setView("home")} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#F9F5EC",padding:"8px 14px",borderRadius:4,cursor:"pointer",marginBottom:14,fontSize:16,fontFamily:"'Caveat',cursive"}}>← Terug</button>
            <h2 style={{fontSize:32,fontWeight:700}}>🏠 Mijn voorraad</h2>
            <div style={{opacity:0.6,fontSize:16,marginTop:4,...lora,fontStyle:"italic"}}>Herkend in recepten</div>
          </div>
          <div style={{padding:"14px 16px"}} className="lined">
            <div style={{display:"flex",gap:8,marginBottom:16}}>
              <input value={pantryInput} onChange={e=>setPantryInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"&&pantryInput.trim()){savePantry([...pantry,pantryInput.trim().toLowerCase()]);setPantryInput("");}}} placeholder="Ingrediënt toevoegen..." style={{flex:1,padding:"8px 10px",background:"transparent",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:20,outline:"none"}} />
              <button onClick={()=>{if(pantryInput.trim()){savePantry([...pantry,pantryInput.trim().toLowerCase()]);setPantryInput("");}}} style={{background:"#C4873A",border:"2px solid #8B5A1A",color:"#FFFEF8",borderRadius:4,padding:"0 14px",fontSize:22,cursor:"pointer",boxShadow:"2px 2px 0 #6B3E10"}}>+</button>
            </div>
            <div style={{display:"flex",flexWrap:"wrap",gap:8}}>
              {pantry.map((item,i)=>(
                <div key={i} style={{display:"flex",alignItems:"center",gap:6,background:"#FFFEF8",border:"1px solid #D4C5A9",borderRadius:3,padding:"5px 10px 5px 12px",fontSize:16,boxShadow:"1px 2px 0 #C4B89A55"}}>
                  🏠 {item}
                  <span onClick={()=>savePantry(pantry.filter((_,j)=>j!==i))} style={{fontSize:15,opacity:0.35,cursor:"pointer",marginLeft:2}}>✕</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ADD */}
      {view==="add"&&(
        <div style={{paddingBottom:100}}>
          <div style={{background:"#2C1A0E",padding:"48px 18px 20px",color:"#F9F5EC"}}>
            <button onClick={()=>setView("home")} style={{background:"rgba(255,255,255,0.1)",border:"none",color:"#F9F5EC",padding:"8px 14px",borderRadius:4,cursor:"pointer",marginBottom:14,fontSize:16,fontFamily:"'Caveat',cursive"}}>← Terug</button>
            <h2 style={{fontSize:32,fontWeight:700}}>Recept toevoegen</h2>
          </div>
          <div style={{padding:"14px 16px"}}>
            {/* AI */}
            <div style={{background:"#FFFEF8",borderRadius:4,padding:16,marginBottom:18,border:"2px solid #C4873A",boxShadow:"2px 3px 0 #C4B89A"}}>
              <div style={{fontWeight:700,fontSize:18,marginBottom:3}}>✨ AI Recept Generator</div>
              <div style={{fontSize:15,opacity:0.65,marginBottom:10,...lora,fontStyle:"italic"}}>Typ een gerechtnaam — kies uit 5 toppers</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6,marginBottom:10}}>
                {["Tomatensoep","Bananenbrood","Pad Thai","Risotto"].map(s=>(
                  <button key={s} onClick={()=>setAiUrl(s)} style={{padding:"4px 12px",background:"#F0E6CC",border:"1px solid #C4B89A",borderRadius:3,fontSize:15,cursor:"pointer",color:"#6B4E2A"}}>{s}</button>
                ))}
              </div>
              <input value={aiUrl} onChange={e=>setAiUrl(e.target.value)} onKeyDown={e=>e.key==="Enter"&&fetchWithAI()} placeholder="'lasagne' of https://recept-site.nl/..." style={{width:"100%",padding:"8px 10px",background:"transparent",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:20,outline:"none",marginBottom:10,boxSizing:"border-box"}} />
              {aiError&&<div style={{background:"#FFE8E8",color:"#C0392B",padding:"8px 12px",borderRadius:3,fontSize:15,marginBottom:10,...lora}}>{aiError}</div>}
              <button onClick={fetchWithAI} disabled={aiLoading||!aiUrl.trim()} className="btn-amber" style={{fontSize:19,opacity:aiLoading||!aiUrl.trim()?0.6:1}}>
                {aiLoading?"⏳ Bezig...":aiUrl.startsWith("http")?"🌐 Importeer van URL":"🔍 Zoek beste recepten"}
              </button>
            </div>

            {showSuggestions&&suggestions.length>0&&(
              <div style={{background:"#FFFEF8",borderRadius:4,border:"2px solid #D4C5A9",marginBottom:18,overflow:"hidden",boxShadow:"2px 3px 0 #C4B89A"}}>
                <div style={{padding:"12px 14px 6px",display:"flex",justifyContent:"space-between",alignItems:"center",borderBottom:"1px dashed #D4C5A9"}}>
                  <div>
                    <div style={{fontWeight:700,fontSize:17}}>🌟 {suggestions.length} recepten gevonden</div>
                    <div style={{fontSize:14,opacity:0.6,...lora,fontStyle:"italic"}}>Tik aan welke je wilt bewaren</div>
                  </div>
                  <div style={{fontSize:15,color:"#C4873A",fontWeight:600}}>{selectedSuggestions.size} gekozen</div>
                </div>
                {suggestions.map((s,i)=>(
                  <div key={i} onClick={()=>setSelectedSuggestions(prev=>{const n=new Set(prev);n.has(i)?n.delete(i):n.add(i);return n;})}
                    style={{display:"flex",alignItems:"center",gap:12,padding:"10px 12px",borderBottom:"1px dashed #E8DDD0",background:selectedSuggestions.has(i)?"#FFF8EC":"#FFFEF8",cursor:"pointer"}}>
                    <div style={{width:58,height:58,borderRadius:3,overflow:"hidden",flexShrink:0,background:(s.color||"#E8C07D")+"44",display:"flex",alignItems:"center",justifyContent:"center",fontSize:28,position:"relative",boxShadow:"1px 2px 0 #C4B89A"}}>
                      <img src={s.imageUrl} alt="" style={{position:"absolute",inset:0,width:"100%",height:"100%",objectFit:"cover",opacity:0.85}} onError={e=>e.target.style.display="none"} />
                      <span style={{position:"relative",zIndex:1}}>{s.emoji}</span>
                    </div>
                    <div style={{flex:1,minWidth:0}}>
                      <div style={{fontWeight:600,fontSize:17}}>{s.title}</div>
                      <div style={{fontSize:13,color:"#C4873A"}}>{"⭐ "+s.rating+" ("+s.reviews+") · "+s.time}</div>
                      <div style={{fontSize:12,opacity:0.5,...lora,fontStyle:"italic",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>🔗 {s.source}</div>
                    </div>
                    <div style={{width:26,height:26,borderRadius:3,border:"2px solid",borderColor:selectedSuggestions.has(i)?"#C4873A":"#C4B89A",background:selectedSuggestions.has(i)?"#C4873A":"transparent",display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,color:"#FFFEF8",flexShrink:0}}>
                      {selectedSuggestions.has(i)?"✓":""}
                    </div>
                  </div>
                ))}
                <div style={{padding:"12px 14px",display:"flex",gap:8,background:"#F0E6CC"}}>
                  <button onClick={()=>{setShowSuggestions(false);setSuggestions([]);setSelectedSuggestions(new Set());}} className="btn-ghost" style={{flex:1,fontSize:17}}>Annuleer</button>
                  <button onClick={importSelectedRecipes} disabled={aiLoading||selectedSuggestions.size===0} className="btn-primary" style={{flex:2,fontSize:18,opacity:selectedSuggestions.size===0?0.5:1}}>
                    {aiLoading?"⏳ Ophalen...":"📖 Sla "+(selectedSuggestions.size||"")+" op"}
                  </button>
                </div>
              </div>
            )}

            <div style={{textAlign:"center",fontSize:15,opacity:0.4,marginBottom:16,...lora,fontStyle:"italic"}}>— of handmatig invullen —</div>

            {[{label:"Naam",field:"title",placeholder:"bv. Spaghetti Bolognese"},{label:"Emoji",field:"emoji",placeholder:"🍽️"},{label:"Tijd",field:"time",placeholder:"30 min"},{label:"Omschrijving",field:"description",placeholder:"Korte omschrijving..."},{label:"Bron URL (optioneel)",field:"sourceUrl",placeholder:"https://..."}].map(({label,field,placeholder})=>(
              <div key={field} style={{marginBottom:12}}>
                <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4,opacity:0.7,...lora}}>{label}</label>
                <input value={addForm[field]} onChange={e=>setAddForm({...addForm,[field]:e.target.value})} placeholder={placeholder} style={{width:"100%",padding:"8px 10px",background:"#FFFEF8",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:19,outline:"none",boxSizing:"border-box"}} />
              </div>
            ))}

            <div style={{marginBottom:12}}>
              <label style={{display:"block",fontSize:14,fontWeight:600,marginBottom:4,opacity:0.7,...lora}}>Categorie</label>
              <select value={addForm.category} onChange={e=>setAddForm({...addForm,category:e.target.value})} style={{width:"100%",padding:"8px 10px",background:"#FFFEF8",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:19,outline:"none"}}>
                {CATEGORIES.filter(c=>c!=="Alle").map(c=><option key={c}>{c}</option>)}
              </select>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:8,opacity:0.7,...lora}}>Ingrediënten</div>
              {addForm.ingredients.map((ing,i)=>(
                <div key={i} style={{display:"flex",gap:5,marginBottom:6}}>
                  <input value={ing.amount} onChange={e=>{const u=[...addForm.ingredients];u[i]={...u[i],amount:e.target.value};setAddForm({...addForm,ingredients:u});}} placeholder="hoev." style={{width:52,padding:"7px 5px",background:"transparent",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:17,outline:"none",textAlign:"center"}} />
                  <input value={ing.unit} onChange={e=>{const u=[...addForm.ingredients];u[i]={...u[i],unit:e.target.value};setAddForm({...addForm,ingredients:u});}} placeholder="enh." style={{width:46,padding:"7px 4px",background:"transparent",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:17,outline:"none",textAlign:"center"}} />
                  <input value={ing.name} onChange={e=>{const u=[...addForm.ingredients];u[i]={...u[i],name:e.target.value};setAddForm({...addForm,ingredients:u});}} placeholder="ingrediënt" style={{flex:1,padding:"7px 8px",background:"transparent",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:17,outline:"none"}} />
                </div>
              ))}
              <button onClick={()=>setAddForm({...addForm,ingredients:[...addForm.ingredients,{amount:"",unit:"",name:""}]})} style={{background:"transparent",border:"2px dashed #C4B89A",borderRadius:3,padding:"6px 14px",fontSize:15,cursor:"pointer",color:"#8B6A3E"}}>+ Ingrediënt</button>
            </div>

            <div style={{marginBottom:20}}>
              <div style={{fontSize:15,fontWeight:600,marginBottom:8,opacity:0.7,...lora}}>Stappen</div>
              {addForm.steps.map((step,i)=>(
                <div key={i} style={{display:"flex",gap:8,marginBottom:10,alignItems:"flex-start"}}>
                  <div style={{width:26,height:26,borderRadius:"50%",background:"#C4873A",display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:"#FFFEF8",flexShrink:0,marginTop:10}}>{i+1}</div>
                  <div style={{flex:1}}>
                    <textarea value={step.text} onChange={e=>{const u=[...addForm.steps];u[i]={...u[i],text:e.target.value};setAddForm({...addForm,steps:u});}} placeholder="Beschrijf de stap..." rows={2} style={{width:"100%",padding:"8px 10px",background:"#FFFEF8",border:"none",borderBottom:"2px dashed #C4B89A",fontSize:16,outline:"none",resize:"none",boxSizing:"border-box",...lora}} />
                    <input value={step.time} onChange={e=>{const u=[...addForm.steps];u[i]={...u[i],time:e.target.value};setAddForm({...addForm,steps:u});}} placeholder="Tijd (bv. 5 min)" style={{width:"100%",padding:"6px 10px",background:"transparent",border:"none",borderBottom:"1px dashed #C4B89A",fontSize:15,outline:"none",marginTop:3,boxSizing:"border-box"}} />
                  </div>
                </div>
              ))}
              <button onClick={()=>setAddForm({...addForm,steps:[...addForm.steps,{text:"",time:""}]})} style={{background:"transparent",border:"2px dashed #C4B89A",borderRadius:3,padding:"6px 14px",fontSize:15,cursor:"pointer",color:"#8B6A3E"}}>+ Stap</button>
            </div>

            <button onClick={saveManualRecipe} className="btn-primary" style={{fontSize:20}}>📖 Recept opslaan</button>
          </div>
        </div>
      )}
    </div>
  );

}

ReactDOM.createRoot(document.getElementById('root')).render(React.createElement(App));