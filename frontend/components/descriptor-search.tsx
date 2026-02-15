"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import {
  Search,
  Loader2,
  Eye,
  FileText,
  MapPin,
  Zap,
  AlertTriangle,
  CheckCircle,
  History,
  Fingerprint,
  Tag,
  Shirt,
} from "lucide-react";

/* ─── Simulated cold/legacy case records ─── */
const legacyCaseDB = [
  {
    id: "LC-001",
    name: "John Doe #47",
    age_estimate: "30-40",
    gender: "Male",
    descriptors: {
      scars: "3-inch scar left forearm",
      tattoos: "Rose on left upper arm",
      clothing: "Blue denim jacket, white sneakers",
      hair: "Brown, short",
      height: "5'10\"",
      dental: "Missing upper left molar",
    },
    narrative: "Found unresponsive near highway overpass after Hurricane Maria evacuation. No identification documents. Subject had blue denim jacket with faded logo. Rose tattoo on left upper arm. 3-inch surgical scar on left forearm.",
    region: "Gulf Coast, TX",
    year: 2017,
    status: "Unresolved",
    source: "Open Intelligence Registry",
    lat: 29.71,
    lng: -95.35,
  },
  {
    id: "LC-002",
    name: "Maria Doe #12",
    age_estimate: "20-25",
    gender: "Female",
    descriptors: {
      scars: "Birthmark on right shoulder",
      tattoos: "Butterfly on ankle",
      clothing: "Red sweater, dark jeans",
      hair: "Black, long",
      height: "5'4\"",
      jewelry: "Silver cross necklace",
    },
    narrative: "Young woman located at temporary shelter following border crossing incident. Spanish-speaking, no ID. Wearing silver cross necklace and red sweater. Small butterfly tattoo on right ankle. Birthmark on right shoulder.",
    region: "Southwest Border, AZ",
    year: 2019,
    status: "Unresolved",
    source: "Open Intelligence Registry",
    lat: 31.95,
    lng: -110.87,
  },
  {
    id: "LC-003",
    name: "David Doe #89",
    age_estimate: "55-65",
    gender: "Male",
    descriptors: {
      scars: "Burn marks on both hands",
      clothing: "Green army jacket, work boots",
      hair: "Gray, balding",
      height: "5'8\"",
      medical: "Diabetes, insulin-dependent",
    },
    narrative: "Elderly male found disoriented near evacuation route during California wildfire. Burn marks on both hands suggest close proximity to fire. Wearing green army surplus jacket. Required immediate medical attention for diabetic episode.",
    region: "Paradise, CA",
    year: 2018,
    status: "Unresolved",
    source: "Open Intelligence Registry",
    lat: 39.76,
    lng: -121.62,
  },
  {
    id: "LC-004",
    name: "Fatima Doe #5",
    age_estimate: "8-12",
    gender: "Female",
    descriptors: {
      clothing: "Pink backpack with star patch, school uniform",
      hair: "Dark brown, braided",
      height: "4'6\"",
      jewelry: "Beaded bracelet, green and white",
    },
    narrative: "Unaccompanied minor found at transit center. Wearing school uniform and pink backpack with star patch. Speaks Arabic and limited English. Green and white beaded bracelet on right wrist. Appeared well-nourished and cared for, suggesting recent separation.",
    region: "New York, NY",
    year: 2022,
    status: "Unresolved",
    source: "Open Intelligence Registry",
    lat: 40.71,
    lng: -74.01,
  },
  {
    id: "LC-005",
    name: "Miguel Doe #33",
    age_estimate: "25-35",
    gender: "Male",
    descriptors: {
      scars: "Knife scar across right cheek",
      tattoos: "\"Familia\" across upper back, eagle on chest",
      clothing: "Black hoodie, running shoes",
      hair: "Black, buzz cut",
      height: "5'7\"",
    },
    narrative: "Adult male separated from group during caravan transit. Distinctive knife scar across right cheek. 'Familia' tattoo across upper back visible. Eagle tattoo on chest. Black hoodie and gray running shoes. Last seen near Laredo checkpoint area.",
    region: "Laredo, TX",
    year: 2021,
    status: "Unresolved",
    source: "Open Intelligence Registry",
    lat: 27.51,
    lng: -99.51,
  },
];

/* ─── Text similarity scorer ─── */
function scoreMatch(query: string, record: typeof legacyCaseDB[0]): number {
  const q = query.toLowerCase();
  const words = q.split(/\s+/).filter((w) => w.length > 2);
  if (words.length === 0) return 0;

  let hits = 0;
  let total = words.length;
  const searchText = [
    record.narrative,
    ...Object.values(record.descriptors),
    record.name,
    record.region,
    record.gender,
    record.age_estimate,
  ]
    .join(" ")
    .toLowerCase();

  for (const word of words) {
    if (searchText.includes(word)) hits++;
  }

  // Bonus for multiple descriptor matches
  const descText = Object.values(record.descriptors).join(" ").toLowerCase();
  let descHits = 0;
  for (const word of words) {
    if (descText.includes(word)) descHits++;
  }

  const baseScore = hits / total;
  const descBonus = descHits > 0 ? 0.15 : 0;
  return Math.min(baseScore + descBonus, 1.0);
}

interface SearchResult {
  record: typeof legacyCaseDB[0];
  score: number;
  matchedDescriptors: string[];
  narrativeRelevance: number;
}

export function DescriptorSearch() {
  const [query, setQuery] = useState("");
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [expanded, setExpanded] = useState<string | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    setResults([]);

    // Simulate network delay
    await new Promise((r) => setTimeout(r, 1200));

    const scored = legacyCaseDB
      .map((record) => {
        const score = scoreMatch(query, record);
        const q = query.toLowerCase();
        const words = q.split(/\s+/).filter((w) => w.length > 2);
        const matchedDescriptors: string[] = [];
        for (const [key, val] of Object.entries(record.descriptors)) {
          for (const word of words) {
            if (val.toLowerCase().includes(word)) {
              matchedDescriptors.push(key);
              break;
            }
          }
        }
        const narrativeWords = words.filter((w) => record.narrative.toLowerCase().includes(w));
        const narrativeRelevance = words.length > 0 ? narrativeWords.length / words.length : 0;

        return { record, score, matchedDescriptors, narrativeRelevance };
      })
      .filter((r) => r.score > 0.1)
      .sort((a, b) => b.score - a.score);

    setResults(scored);
    setSearching(false);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Search className="h-4 w-4 text-primary" />
          Multimodal Description Search
          <Badge variant="outline" className="text-[10px] font-normal">No photo required</Badge>
        </CardTitle>
        <p className="text-xs text-muted-foreground mt-1">
          Search across historical intelligence using natural language descriptions.
          Matches against structured identity descriptors: scars, tattoos, clothing, dental records, jewelry, and narratives.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Search input */}
        <div className="space-y-2">
          <Textarea
            placeholder="e.g., &quot;blue jacket, rose tattoo left arm, scar on forearm, male 30s, Gulf Coast&quot;"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            rows={2}
            className="text-sm"
          />
          <div className="flex items-center justify-between">
            <div className="flex flex-wrap gap-1">
              {["tattoo", "scar", "clothing", "jewelry", "dental", "nickname"].map((tag) => (
                <button
                  key={tag}
                  type="button"
                  className="rounded-full border px-2 py-0.5 text-[10px] text-muted-foreground hover:bg-muted transition-colors"
                  onClick={() => setQuery((prev) => `${prev} ${tag}`.trim())}
                >
                  +{tag}
                </button>
              ))}
            </div>
            <Button
              size="sm"
              className="gap-1.5"
              onClick={handleSearch}
              disabled={searching || !query.trim()}
            >
              {searching ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Search className="h-3.5 w-3.5" />
              )}
              {searching ? "Scanning..." : "Search Legacy Intelligence"}
            </Button>
          </div>
        </div>

        {/* Example queries */}
        {results.length === 0 && !searching && (
          <div className="rounded-lg bg-muted/50 border p-3">
            <p className="text-xs font-medium mb-1.5">Example queries:</p>
            <div className="space-y-1 text-xs text-muted-foreground">
              <button
                type="button"
                className="block hover:text-foreground transition-colors text-left"
                onClick={() => setQuery("blue jacket rose tattoo scar forearm male Gulf Coast")}
              >
                &ldquo;blue jacket rose tattoo scar forearm male Gulf Coast&rdquo;
              </button>
              <button
                type="button"
                className="block hover:text-foreground transition-colors text-left"
                onClick={() => setQuery("silver cross necklace butterfly tattoo female young")}
              >
                &ldquo;silver cross necklace butterfly tattoo female young&rdquo;
              </button>
              <button
                type="button"
                className="block hover:text-foreground transition-colors text-left"
                onClick={() => setQuery("pink backpack star school uniform child braided hair")}
              >
                &ldquo;pink backpack star school uniform child braided hair&rdquo;
              </button>
            </div>
          </div>
        )}

        {/* Results */}
        <AnimatePresence>
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-3"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="text-muted-foreground">
                  {results.length} match{results.length !== 1 ? "es" : ""} from legacy intelligence
                </span>
                <Badge variant="outline" className="text-[9px]">
                  <History className="h-2.5 w-2.5 mr-0.5" />
                  Open Intelligence Registry
                </Badge>
              </div>

              {results.map((r, i) => (
                <motion.div
                  key={r.record.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.08 }}
                >
                  <Card className={`transition-all ${r.score > 0.5 ? "border-green-200" : r.score > 0.3 ? "border-amber-200" : ""}`}>
                    <CardContent className="p-4 space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold">{r.record.name}</span>
                            <Badge variant="outline" className="text-[9px]">{r.record.id}</Badge>
                            <Badge
                              variant="outline"
                              className={`text-[9px] ${
                                r.record.status === "Unresolved"
                                  ? "border-amber-200 text-amber-600"
                                  : "border-green-200 text-green-600"
                              }`}
                            >
                              {r.record.status}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1">
                            <span>{r.record.gender}, est. {r.record.age_estimate}</span>
                            <span className="flex items-center gap-0.5">
                              <MapPin className="h-2.5 w-2.5" />
                              {r.record.region}
                            </span>
                            <span>{r.record.year}</span>
                          </div>
                        </div>

                        {/* Score */}
                        <div className={`text-center rounded-lg border p-2 ${
                          r.score > 0.5 ? "bg-green-50 border-green-200" :
                          r.score > 0.3 ? "bg-amber-50 border-amber-200" :
                          "bg-muted/50"
                        }`}>
                          <div className={`text-lg font-bold ${
                            r.score > 0.5 ? "text-green-700" :
                            r.score > 0.3 ? "text-amber-700" : "text-muted-foreground"
                          }`}>
                            {Math.round(r.score * 100)}%
                          </div>
                          <div className="text-[9px] text-muted-foreground">Relevance</div>
                        </div>
                      </div>

                      {/* Matched descriptors */}
                      <div className="flex flex-wrap gap-1.5">
                        {r.matchedDescriptors.map((d) => (
                          <Badge key={d} variant="secondary" className="text-[10px] gap-0.5 capitalize">
                            <Fingerprint className="h-2.5 w-2.5" />
                            {d.replace("_", " ")}
                          </Badge>
                        ))}
                        {r.narrativeRelevance > 0.3 && (
                          <Badge variant="secondary" className="text-[10px] gap-0.5">
                            <FileText className="h-2.5 w-2.5" />
                            Narrative match
                          </Badge>
                        )}
                      </div>

                      {/* Score bars */}
                      <div className="grid grid-cols-2 gap-3">
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground flex items-center gap-0.5">
                              <Tag className="h-2.5 w-2.5" /> Descriptor match
                            </span>
                            <span className="font-medium">{Math.round(r.score * 100)}%</span>
                          </div>
                          <Progress value={r.score * 100} className="h-1.5 [&>div]:bg-blue-500" />
                        </div>
                        <div>
                          <div className="flex justify-between text-[10px] mb-0.5">
                            <span className="text-muted-foreground flex items-center gap-0.5">
                              <FileText className="h-2.5 w-2.5" /> Narrative similarity
                            </span>
                            <span className="font-medium">{Math.round(r.narrativeRelevance * 100)}%</span>
                          </div>
                          <Progress value={r.narrativeRelevance * 100} className="h-1.5 [&>div]:bg-purple-500" />
                        </div>
                      </div>

                      {/* Expandable narrative */}
                      <button
                        type="button"
                        className="text-xs text-primary hover:text-primary/80 transition-colors"
                        onClick={() => setExpanded(expanded === r.record.id ? null : r.record.id)}
                      >
                        {expanded === r.record.id ? "Hide narrative" : "Show full narrative"}
                      </button>
                      <AnimatePresence>
                        {expanded === r.record.id && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: "auto", opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            className="overflow-hidden"
                          >
                            <div className="rounded-lg bg-muted/50 border p-3 text-xs space-y-2">
                              <p className="font-medium flex items-center gap-1">
                                <FileText className="h-3 w-3" /> Case Narrative
                              </p>
                              <p className="text-muted-foreground leading-relaxed">{r.record.narrative}</p>
                              <div className="flex flex-wrap gap-2 pt-1 border-t">
                                {Object.entries(r.record.descriptors).map(([k, v]) => (
                                  <div key={k} className="text-[10px]">
                                    <span className="font-medium capitalize">{k.replace("_", " ")}:</span>{" "}
                                    <span className="text-muted-foreground">{v}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </CardContent>
    </Card>
  );
}
