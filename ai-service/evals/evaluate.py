import json
import logging
import os
import sys

from google import genai
from google.genai import types

# Add parent directory to path so we can import modules
sys.path.append(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from embeddings import generate_embeddings
from prompts import ANALYZE_PROMPT
from analyzer import call_gemini
from llm import gemini_client

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Config
DATASET_PATH = os.path.join(os.path.dirname(__file__), "golden_dataset.json")
MODEL = "gemini-3.1-flash-lite"

def cosine_similarity(v1, v2):
    dot_product = sum(a * b for a, b in zip(v1, v2))
    norm_v1 = sum(a * a for a in v1) ** 0.5
    norm_v2 = sum(b * b for b in v2) ** 0.5
    if norm_v1 == 0 or norm_v2 == 0:
        return 0.0
    return dot_product / (norm_v1 * norm_v2)


def judge_faithfulness(source_chunks: list[str], generated_bullets: list[str]) -> float:
    prompt = f"""
You are an expert evaluator. Your task is to rate the FAITHFULNESS of generated resume bullets against the original source resume chunks.
Faithfulness means the generated bullets do NOT invent new skills, metrics, or experiences that are not present in the source chunks.

SOURCE CHUNKS:
{json.dumps(source_chunks, indent=2)}

GENERATED BULLETS:
{json.dumps(generated_bullets, indent=2)}

Score the faithfulness from 1 to 5:
5: Perfect. No hallucinations.
4: Minor embellishments but fundamentally true to the source.
3: Contains some unsupported claims.
2: Major hallucinations.
1: Completely fabricated.

Provide ONLY the integer score as your output, nothing else.
"""
    import time
    for attempt in range(3):
        try:
            response = gemini_client.models.generate_content(
                model=MODEL,
                contents=prompt,
                config=types.GenerateContentConfig(temperature=0.0)
            )
            score_text = response.text.strip()
            digits = [int(s) for s in score_text.split() if s.isdigit()]
            if digits:
                return float(digits[-1])
            for char in score_text:
                if char.isdigit():
                    return float(char)
            return 1.0
        except Exception as e:
            if hasattr(e, 'code') and (e.code == 429 or e.code == 503):
                wait = 5 * (2 ** attempt)
                logger.warning(f"Judge API Error ({e.code}). Retry {attempt+1}/3 in {wait}s")
                time.sleep(wait)
                continue
            logger.error(f"Judge failed: {e}")
            return None
    return 1.0


def run_evaluations():
    with open(DATASET_PATH, 'r') as f:
        dataset = json.loads(f.read())
        
    chunks = dataset["chunks"]
    cases = dataset["cases"]
    
    logger.info(f"Loaded {len(chunks)} chunks and {len(cases)} cases.")
    
    
    # 1. Embed all chunks and build full resume text
    chunk_texts = [c["text"] for c in chunks]
    full_resume_text = "\n\n".join(chunk_texts)
    chunk_embeddings = generate_embeddings(chunk_texts)
    
    for idx, c in enumerate(chunks):
        c["embedding"] = chunk_embeddings[idx]
        
    recall_scores = []
    faithfulness_scores = []
    
    for idx, case in enumerate(cases):
        jd_text = case["jd_text"]
        expected_ids = case["expected_chunk_ids"]
        
        # 2. Embed JD
        jd_emb = generate_embeddings([jd_text])[0]
        
        # 3. Calculate similarities
        chunk_scores = []
        for c in chunks:
            sim = cosine_similarity(jd_emb, c["embedding"])
            chunk_scores.append((c["id"], c["text"], sim))
            
        # Sort by highest similarity
        chunk_scores.sort(key=lambda x: x[2], reverse=True)
        top_5 = chunk_scores[:5]
        top_5_ids = [x[0] for x in top_5]
        top_5_texts = [x[1] for x in top_5]
        
        # 4. Calculate Recall@5
        hits = sum(1 for eid in expected_ids if eid in top_5_ids)
        recall = hits / len(expected_ids)
        recall_scores.append(recall)
        
        logger.info(f"Case {idx+1}: Recall@5 = {recall*100}%")
        
        # 5. Generate tailored bullets (ONLY showing retrieved chunks, NO full resume)
        # We simulate the generation step isolating retrieval quality
        
        relevant_chunks_section = "RELEVANT RESUME EXPERIENCES (PRIORITIZE THESE):\n- " + "\n- ".join(top_5_texts)
        
        isolated_prompt = f"""\
You are a career-fit analyst. Given a candidate's resume and a job description, evaluate how well the candidate matches the role.

Be specific, not generic. Reference exact technologies, skills, and phrases from both documents.
For suggested_bullets, you MUST rewrite bullets prioritizing the RELEVANT RESUME EXPERIENCES.
CRITICAL GROUNDING INSTRUCTION: Only use facts explicitly present in the provided excerpts. Do not infer or add skills, tools, metrics, or claims not stated in them.
CRITICAL MERGING INSTRUCTION: Each excerpt may come from a different job or project. Do not combine facts from separate excerpts into a single claim implying they occurred together, unless explicitly stated.

{relevant_chunks_section}

JOB DESCRIPTION:
{jd_text}
"""
        
        try:
            result_obj = call_gemini(isolated_prompt, MODEL)
            suggested_bullets = result_obj.suggested_bullets
            
            # 6. Judge Faithfulness
            faithfulness = judge_faithfulness(top_5_texts, suggested_bullets)
            if faithfulness is not None:
                faithfulness_scores.append(faithfulness)
                logger.info(f"Case {idx+1}: Faithfulness = {faithfulness}/5.0")
                if faithfulness == 3.0:
                    logger.info(f"\n--- CASE {idx+1} (SCORE 3.0) EXPLORATION ---")
                    logger.info(f"Source Chunks:\n{json.dumps(top_5_texts, indent=2)}")
                    logger.info(f"Generated Bullets:\n{json.dumps(suggested_bullets, indent=2)}")
                    logger.info("-------------------------------------------\n")
            else:
                logger.warning(f"Case {idx+1}: Judge evaluation failed (not evaluated)")
        except Exception as e:
            logger.error(f"Generation failed for case {idx+1}: {e}")
            logger.warning(f"Case {idx+1}: Generation failed (not evaluated)")
            
        import time
        time.sleep(5)
            
    # Final Metrics
    avg_recall = sum(recall_scores) / len(recall_scores) if recall_scores else 0.0
    avg_faithfulness = sum(faithfulness_scores) / len(faithfulness_scores) if faithfulness_scores else 0.0
    
    print("\n" + "="*40)
    print("EVALUATION RESULTS")
    print("="*40)
    print(f"Average Recall@5:      {avg_recall*100:.2f}% (Threshold: >= 80%)")
    print(f"Average Faithfulness:  {avg_faithfulness:.2f}/5.0 (Threshold: >= 4.0)")
    print("="*40)
    
    if avg_recall >= 0.8 and avg_faithfulness >= 4.0:
        print("PASS! The RAG pipeline meets quality thresholds.")
    else:
        print("FAIL. The RAG pipeline needs improvement.")

if __name__ == "__main__":
    run_evaluations()
