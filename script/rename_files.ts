#!/usr/bin/env node
/**
 * Exam File Rename Script
 * Renames exam files according to the naming convention
 */

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';

// Fixed values
const GRADE_LEVEL = "고3";
const EXAM_TYPE = "수능";
const EXAM_YEAR = "2024";
const EXAM_MONTH = "11";
const SOURCE = "평가원";

// Subject mappings
const SUBJECT_MAPPINGS: Record<string, { category: string; subject: string; selection: string | null }> = {
    // 국어 category
    "국어": { category: "국어", subject: "국어", selection: null },
    
    // 수학 category
    "수학": { category: "수학", subject: "수학", selection: null },
    
    // 영어 category
    "영어": { category: "영어", subject: "영어", selection: null },
    
    // 한국사 category
    "한국사": { category: "한국사", subject: "한국사", selection: null },
    
    // 사회탐구 category
    "생활과윤리": { category: "사회탐구", subject: "생활과 윤리", selection: null },
    "윤리와사상": { category: "사회탐구", subject: "윤리와 사상", selection: null },
    "한국지리": { category: "사회탐구", subject: "한국지리", selection: null },
    "세계지리": { category: "사회탐구", subject: "세계지리", selection: null },
    "동아시아사": { category: "사회탐구", subject: "동아시아사", selection: null },
    "세계사": { category: "사회탐구", subject: "세계사", selection: null },
    "경제": { category: "사회탐구", subject: "경제", selection: null },
    "정치와법": { category: "사회탐구", subject: "정치와 법", selection: null },
    "사회문화": { category: "사회탐구", subject: "사회·문화", selection: null },
    
    // 과학탐구 category
    "물리학1": { category: "과학탐구", subject: "물리학 I", selection: null },
    "물리학2": { category: "과학탐구", subject: "물리학 II", selection: null },
    "화학1": { category: "과학탐구", subject: "화학 I", selection: null },
    "화학2": { category: "과학탐구", subject: "화학 II", selection: null },
    "생명과학1": { category: "과학탐구", subject: "생명과학 I", selection: null },
    "생명과학2": { category: "과학탐구", subject: "생명과학 II", selection: null },
    "지구과학1": { category: "과학탐구", subject: "지구과학 I", selection: null },
    "지구과학2": { category: "과학탐구", subject: "지구과학 II", selection: null },
};

// Document type mappings
const DOC_TYPE_MAPPINGS: Record<string, string> = {
    "문제": "problem",
    "정답": "answer",
    "답지": "answer"
};

function extractSubjectFromFilename(filename: string): string | null {
    /** Extract subject from filename */
    // Remove file extension
    const nameWithoutExt = path.parse(filename).name;
    
    // Extract subject from the pattern "2025학년도-대학수학능력시험-{subject}-{doc_type}"
    // Handle special case for 생명과학2-정답-1.pdf
    if (nameWithoutExt.includes("생명과학2-정답-1")) {
        return "생명과학2";
    }
    
    const match = nameWithoutExt.match(/2025학년도-대학수학능력시험-(.+?)-(문제|정답|답지)/);
    if (match) {
        return match[1];
    }
    return null;
}

function extractDocTypeFromFilename(filename: string): string | null {
    /** Extract document type from filename */
    const nameWithoutExt = path.parse(filename).name;
    
    // Handle special case for 생명과학2-정답-1.pdf
    if (nameWithoutExt.includes("생명과학2-정답-1")) {
        return "정답";
    }
    
    // Extract doc type from the pattern "2025학년도-대학수학능력시험-{subject}-{doc_type}"
    const match = nameWithoutExt.match(/2025학년도-대학수학능력시험-.+?-(문제|정답|답지)/);
    if (match) {
        return match[1];
    }
    return null;
}

function generateNewFilename(oldFilename: string): string | null {
    /** Generate new filename according to the specified format */
    const subjectKey = extractSubjectFromFilename(oldFilename);
    const docTypeKey = extractDocTypeFromFilename(oldFilename);
    
    if (!subjectKey || !docTypeKey) {
        console.log(`Could not parse filename: ${oldFilename}`);
        return null;
    }
    
    if (!(subjectKey in SUBJECT_MAPPINGS)) {
        console.log(`Unknown subject: ${subjectKey}`);
        return null;
    }
    
    if (!(docTypeKey in DOC_TYPE_MAPPINGS)) {
        console.log(`Unknown document type: ${docTypeKey}`);
        return null;
    }
    
    const subjectInfo = SUBJECT_MAPPINGS[subjectKey];
    const docType = DOC_TYPE_MAPPINGS[docTypeKey];
    
    // Build new filename
    const parts = [
        GRADE_LEVEL,
        subjectInfo.category,
        subjectInfo.subject,
        subjectInfo.selection || "",
        EXAM_TYPE,
        EXAM_YEAR,
        EXAM_MONTH,
        SOURCE,
        docType
    ];
    
    // Join with underscore (including empty parts)
    const newFilename = parts.join("_") + ".pdf";
    
    return newFilename;
}

async function askForConfirmation(prompt: string): Promise<boolean> {
    /** Ask user for confirmation */
    const rl = readline.createInterface({
        input: process.stdin,
        output: process.stdout
    });
    
    return new Promise((resolve) => {
        rl.question(prompt, (answer) => {
            rl.close();
            resolve(answer.toLowerCase() === 'y');
        });
    });
}

async function renameFiles(): Promise<void> {
    /** Rename all files in the current directory */
    const files = fs.readdirSync('.')
        .filter(f => f.endsWith('.pdf') && f !== '.DS_Store')
        .sort();
    
    console.log("Files to be renamed:");
    console.log("-".repeat(80));
    
    for (const oldFilename of files) {
        const newFilename = generateNewFilename(oldFilename);
        if (newFilename) {
            console.log(`${oldFilename} -> ${newFilename}`);
        } else {
            console.log(`ERROR: Could not process ${oldFilename}`);
        }
    }
    
    console.log("-".repeat(80));
    
    // Ask for confirmation
    const shouldProceed = await askForConfirmation("Do you want to proceed with renaming? (y/N): ");
    if (!shouldProceed) {
        console.log("Renaming cancelled.");
        return;
    }
    
    // Perform the renaming
    console.log("\nRenaming files...");
    for (const oldFilename of files) {
        const newFilename = generateNewFilename(oldFilename);
        if (newFilename) {
            try {
                fs.renameSync(oldFilename, newFilename);
                console.log(`✓ Renamed: ${oldFilename} -> ${newFilename}`);
            } catch (error) {
                console.log(`✗ Error renaming ${oldFilename}: ${error}`);
            }
        } else {
            console.log(`✗ Skipped: ${oldFilename}`);
        }
    }
    
    console.log("\nRenaming completed!");
}

// Run the script
if (require.main === module) {
    renameFiles().catch(console.error);
} 