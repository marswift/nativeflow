# NativeFlow Cursor Rules

This repository builds NativeFlow.

NativeFlow is an AI language learning SaaS.

The project is managed by ChatGPT as the product architect.

Cursor is responsible for implementation.

Claude assists with analysis and specification clarification.

---

# Core Principles

Keep MVP simple.

Do not add unnecessary features.

Do not change architecture unless explicitly requested.

Do not modify database schema unless instructed.

Prefer small incremental changes.

---

# Tech Stack

Next.js (App Router)

TypeScript

Supabase

Stripe

OpenAI

Vercel

---

# Product Principles

NativeFlow focuses on life simulation language learning.

Daily flow example

Wake up  
Breakfast  
Commute  
Work / Study  
Lunch  
Shopping  
Dinner  
Relax  
Sleep

---

# UI Principles

UI must be

Simple  
Warm  
Clear  

Avoid heavy design systems during MVP.

---

# Database Rules

Supabase is the backend.

Existing tables must not be modified unless requested.

Key tables

user_profiles  
phrase_master  
user_phrase_progress  
lessons  
lesson_blocks  

---

# AI Collaboration Model

Product decisions → ChatGPT

Specification clarification → Claude

Implementation → Cursor

Cursor must follow architecture decisions.