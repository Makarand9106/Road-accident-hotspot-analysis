/**
 * Parser for database/analytical_queries.sql.
 * Extracts metadata, questions, concepts, and clean executable SQL for all 20 course queries.
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const SQL_FILE_PATH = path.resolve(__dirname, '../../../database/analytical_queries.sql');

let cachedQueries = null;

/**
 * Parse discrete numbered query blocks from analytical_queries.sql.
 * @returns {Array<{ id: number, query_number: number, title: string, question: string, concepts: string, why_it_matters: string, viva_explanation: string, sql: string }>}
 */
export function getAnalyticalQueries() {
  if (cachedQueries) return cachedQueries;

  if (!fs.existsSync(SQL_FILE_PATH)) {
    throw new Error(`SQL file not found at: ${SQL_FILE_PATH}`);
  }

  const content = fs.readFileSync(SQL_FILE_PATH, 'utf-8');
  const headerRegex = /--\s*QUERY\s*(\d+):\s*([^\n]+)/gi;
  const matches = [...content.matchAll(headerRegex)];
  const queries = [];

  for (let i = 0; i < matches.length; i++) {
    const currentMatch = matches[i];
    const queryNum = parseInt(currentMatch[1], 10);
    const title = currentMatch[2].trim();
    const startIndex = currentMatch.index;
    const endIndex = (i + 1 < matches.length) ? matches[i + 1].index : content.length;
    const blockText = content.slice(startIndex, endIndex).trim();

    // Extract commentary sections
    const questionMatch = blockText.match(/--\s*Question:\s*([^\n]+)/i);
    const conceptsMatch = blockText.match(/--\s*Concepts Used:\s*([^\n]+)/i);
    const whyMatch = blockText.match(/--\s*Why It Matters:\s*([^\n]+)/i);
    const vivaMatch = blockText.match(/--\s*Viva Explanation:\s*([^\n]+)/i);

    // Strip comment lines to isolate clean executable SQL
    const sqlLines = [];
    for (const line of blockText.split('\n')) {
      const trimmed = line.trim();
      if (!trimmed.startsWith('--') && trimmed.length > 0) {
        sqlLines.push(line);
      }
    }
    const cleanSql = sqlLines.join('\n').trim();

    if (cleanSql) {
      queries.push({
        id: queryNum,
        query_number: queryNum,
        title,
        question: questionMatch ? questionMatch[1].trim() : title,
        concepts: conceptsMatch ? conceptsMatch[1].trim() : 'SQL Aggregations',
        why_it_matters: whyMatch ? whyMatch[1].trim() : '',
        viva_explanation: vivaMatch ? vivaMatch[1].trim() : '',
        sql: cleanSql,
      });
    }
  }

  cachedQueries = queries.sort((a, b) => a.query_number - b.query_number);
  return cachedQueries;
}

/**
 * Retrieve a single analytical query by query number (1 to 20).
 * @param {number} queryNumber
 */
export function getAnalyticalQueryByNumber(queryNumber) {
  const queries = getAnalyticalQueries();
  return queries.find((q) => q.query_number === queryNumber) || null;
}
