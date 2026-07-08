"""
RAG (Retrieval Augmented Generation) Module for Fitness Coach.

This module implements a simple in-memory vector store for fitness knowledge.
In production, this would use Pinecone or another vector database.
"""

from typing import List, Dict, Any, Optional
import json
from datetime import datetime

try:
    from langchain.embeddings import OpenAIEmbeddings
    from langchain.vectorstores import FAISS
    from langchain.text_splitter import RecursiveCharacterTextSplitter
    from langchain.docstore.document import Document
    EMBEDDINGS_AVAILABLE = True
except ImportError:
    EMBEDDINGS_AVAILABLE = False
    print("RAG dependencies not installed. Install with: pip install faiss-cpu")

from config import settings


class FitnessKnowledgeBase:
    """In-memory fitness knowledge base with vector similarity search"""
    
    # Fitness knowledge base
    KNOWLEDGE = [
        {
            "topic": "Compound Exercises",
            "content": """Compound exercises are multi-joint movements that work multiple muscle groups simultaneously. 
            Key compound exercises include: Squat (quads, glutes, hamstrings, core), Deadlift (posterior chain, grip, core), 
            Bench Press (chest, shoulders, triceps), Overhead Press (shoulders, triceps, core), and Barbell Row (back, biceps).
            Benefits: More efficient workouts, greater hormone release, improved functional strength, better calorie burn.""",
        },
        {
            "topic": "Progressive Overload",
            "content": """Progressive overload is the gradual increase of stress placed on the body during training. 
            Methods include: Increasing weight (most common), Adding repetitions, Adding sets, Reducing rest time, 
            Increasing training frequency, Improving form and range of motion. Aim for 2-10% increases in weight or volume weekly.
            This is the fundamental principle for building muscle and strength over time.""",
        },
        {
            "topic": "Protein Intake",
            "content": """Protein recommendations for athletes and active individuals: 
            General fitness: 1.2-1.6g per kg bodyweight daily. Muscle building: 1.6-2.2g per kg bodyweight daily.
            Fat loss while preserving muscle: 2.0-2.4g per kg bodyweight daily. Distribute protein across 3-5 meals.
            Complete protein sources include: meat, fish, eggs, dairy, soy. Aim for 20-40g per meal for optimal muscle protein synthesis.""",
        },
        {
            "topic": "Recovery and Rest",
            "content": """Recovery is when adaptation occurs. Key principles: Sleep 7-9 hours nightly for hormone production and tissue repair.
            Rest days: 1-2 per week minimum for CNS recovery. Deload weeks: Every 4-8 weeks reduce volume by 40-50%. 
            Active recovery: Light cardio, mobility work, stretching. Nutrition: Maintain protein intake, adequate hydration.
            Signs of inadequate recovery: Persistent fatigue, decreased performance, elevated resting heart rate, mood changes.""",
        },
        {
            "topic": "Cardiovascular Training",
            "content": """Cardio training types and benefits: LISS (Low Intensity Steady State): 45-60 minutes at 60-70% max HR, 
            good for recovery and fat oxidation. MISS (Moderate Intensity): 20-40 minutes at 70-80% max HR, improves aerobic capacity.
            HIIT (High Intensity Interval Training): Short bursts at 85-95% max HR with rest, improves VO2 max and metabolism.
            Frequency: 2-4 sessions per week depending on goals. Balance with strength training to avoid interference effect.""",
        },
        {
            "topic": "Nutrition Timing",
            "content": """Meal timing strategies: Pre-workout (1-3 hours before): Carbs + protein for energy and muscle protection.
            Post-workout (within 2 hours): Protein + carbs for recovery and glycogen replenishment. Protein distribution: 
            Spread across 3-5 meals for optimal muscle protein synthesis. Fasting: Not necessary for most goals, meal timing 
            is less important than total daily intake. The 'anabolic window' is longer than previously thought (4-6 hours).""",
        },
        {
            "topic": "Training Splits",
            "content": """Common training splits: Full Body (3x/week): Each session trains all major muscle groups.
            Upper/Lower (4x/week): Alternates upper and lower body. Push/Pull/Legs (6x/week): Push (chest, shoulders, triceps), 
            Pull (back, biceps), Legs (quads, hamstrings, calves). Bro Split (5-6x/week): One muscle group per day.
            Choose based on: Training experience, recovery capacity, schedule, goals. Beginners benefit from full body or upper/lower.""",
        },
        {
            "topic": "Core Training",
            "content": """Effective core training goes beyond crunches: Anti-extension (planks, ab wheel), Anti-rotation (Pallof press),
            Anti-lateral flexion (side planks, suitcase carries), Rotation (cable chops, Russian twists). 
            Frequency: 2-4 times per week. Volume: 2-4 sets of 8-15 reps or 20-60 second holds. 
            The core is trained during compound movements (squats, deadlifts) but direct work ensures balanced development.""",
        },
        {
            "topic": "Mobility and Flexibility",
            "content": """Mobility vs Flexibility: Flexibility is passive range of motion, mobility is active control through ROM.
            Dynamic stretching: Before workouts to prepare joints and muscles. Static stretching: After workouts when muscles are warm.
            Key areas: Hips, thoracic spine, ankles, shoulders. Perform mobility work daily: 10-15 minutes.
            Tools: Foam rolling, lacrosse balls, resistance bands. Improves performance and reduces injury risk.""",
        },
        {
            "topic": "Supplements",
            "content": """Evidence-based supplements: Creatine monohydrate (5g daily): Increases strength and muscle mass.
            Protein powder: Convenient protein source, not necessary if diet is adequate. Caffeine (3-6mg/kg): Pre-workout performance boost.
            Vitamin D: If deficient, impacts bone health and immune function. Fish oil: Supports inflammation management.
            Beta-alanine: May help with high-rep training. Most supplements are not necessary with proper nutrition.
            Focus on diet, training, sleep before adding supplements.""",
        },
    ]
    
    def __init__(self):
        """Initialize the knowledge base"""
        self.documents = []
        self.vectorstore = None
        self.embeddings = None
        
        if settings.ENABLE_RAG and EMBEDDINGS_AVAILABLE and settings.OPENAI_API_KEY:
            try:
                self._initialize_vectorstore()
                print(" RAG Knowledge Base initialized successfully")
            except Exception as e:
                print(f" RAG initialization failed: {e}")
                settings.ENABLE_RAG = False
        else:
            print(" RAG disabled: Missing dependencies or API key")
    
    def _initialize_vectorstore(self):
        """Initialize FAISS vector store with fitness knowledge"""
        # Create documents from knowledge base
        documents = []
        for item in self.KNOWLEDGE:
            doc = Document(
                page_content=item["content"],
                metadata={"topic": item["topic"], "source": "fitness_kb"},
            )
            documents.append(doc)
        
        # Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=500,
            chunk_overlap=50,
            length_function=len,
        )
        
        self.documents = text_splitter.split_documents(documents)
        
        # Create embeddings and vectorstore
        self.embeddings = OpenAIEmbeddings(openai_api_key=settings.OPENAI_API_KEY)
        self.vectorstore = FAISS.from_documents(self.documents, self.embeddings)
    
    def search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """
        Search for relevant fitness knowledge
        
        Args:
            query: Search query
            k: Number of results to return
        
        Returns:
            List of relevant documents with metadata
        """
        if not settings.ENABLE_RAG or not self.vectorstore:
            # Fallback: Simple keyword matching
            return self._keyword_search(query, k)
        
        try:
            # Semantic search using vector similarity
            docs = self.vectorstore.similarity_search(query, k=k)
            
            results = []
            for doc in docs:
                results.append({
                    "content": doc.page_content,
                    "topic": doc.metadata.get("topic", "Unknown"),
                    "source": doc.metadata.get("source", "fitness_kb"),
                })
            
            return results
        
        except Exception as e:
            print(f" RAG search error: {e}")
            return self._keyword_search(query, k)
    
    def _keyword_search(self, query: str, k: int = 3) -> List[Dict[str, Any]]:
        """Fallback keyword-based search"""
        query_lower = query.lower()
        results = []
        
        for item in self.KNOWLEDGE:
            # Simple relevance scoring
            score = 0
            for word in query_lower.split():
                if word in item["topic"].lower():
                    score += 3
                if word in item["content"].lower():
                    score += 1
            
            if score > 0:
                results.append({
                    "content": item["content"],
                    "topic": item["topic"],
                    "source": "fitness_kb",
                    "score": score,
                })
        
        # Sort by score and return top k
        results.sort(key=lambda x: x.get("score", 0), reverse=True)
        return results[:k]
    
    def get_context_for_query(self, query: str, max_length: int = 1000) -> str:
        """
        Get relevant context for a query
        
        Args:
            query: User query
            max_length: Maximum character length of context
        
        Returns:
            Formatted context string
        """
        docs = self.search(query, k=2)
        
        if not docs:
            return ""
        
        context_parts = ["Relevant fitness knowledge:"]
        total_length = len(context_parts[0])
        
        for doc in docs:
            topic = doc["topic"]
            content = doc["content"][:300]  # Truncate long content
            
            part = f"\n\n**{topic}**: {content}"
            if total_length + len(part) > max_length:
                break
            
            context_parts.append(part)
            total_length += len(part)
        
        return "".join(context_parts)


# Global knowledge base instance
_knowledge_base: Optional[FitnessKnowledgeBase] = None


def get_knowledge_base() -> FitnessKnowledgeBase:
    """Get or create the global knowledge base instance"""
    global _knowledge_base
    if _knowledge_base is None:
        _knowledge_base = FitnessKnowledgeBase()
    return _knowledge_base
