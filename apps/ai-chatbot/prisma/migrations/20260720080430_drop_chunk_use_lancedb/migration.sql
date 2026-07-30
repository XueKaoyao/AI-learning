/*
  Warnings:

  - You are about to drop the `Chunk` table. If the table is not empty, all the data it contains will be lost.

*/
-- DropForeignKey
ALTER TABLE "Chunk" DROP CONSTRAINT "Chunk_documentId_fkey";

-- DropTable
DROP TABLE "Chunk";
