import { FastifyInstance } from 'fastify';
import { PrismaClient } from '@prisma/client';
import { resolve, join } from 'path';
import { createWriteStream, unlinkSync, mkdirSync } from 'fs';
import { randomUUID } from 'crypto';
import { pipeline } from 'stream/promises';

export default function attachmentRoutes(app: FastifyInstance, prisma: PrismaClient, uploadsDir: string) {
  // Upload attachment(s) for a question
  app.post('/questions/:questionId/attachments', async (req, reply) => {
    const { questionId } = req.params as { questionId: string };

    // Verify question exists
    const question = await prisma.question.findUnique({ where: { id: questionId } });
    if (!question) return reply.code(404).send({ message: 'Question not found' });

    // Create question-specific upload dir
    const questionDir = join(uploadsDir, 'questions', questionId);
    mkdirSync(questionDir, { recursive: true });

    const parts = req.parts();
    const created = [];

    for await (const part of parts) {
      if (part.type !== 'file') continue;

      const ext = part.filename.includes('.') ? '.' + part.filename.split('.').pop() : '';
      const storedName = `${randomUUID()}${ext}`;
      const filePath = resolve(questionDir, storedName);
      const relativePath = `questions/${questionId}/${storedName}`;

      await pipeline(part.file, createWriteStream(filePath));

      const attachment = await prisma.questionAttachment.create({
        data: {
          questionId,
          filename: part.filename,
          mimeType: part.mimetype,
          size: part.file.bytesRead,
          path: relativePath,
        },
      });
      created.push(attachment);
    }

    return reply.code(201).send(created);
  });

  // List attachments for a question
  app.get('/questions/:questionId/attachments', async (req) => {
    const { questionId } = req.params as { questionId: string };
    return prisma.questionAttachment.findMany({
      where: { questionId },
      orderBy: { createdAt: 'asc' },
    });
  });

  // Delete an attachment
  app.delete('/attachments/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const attachment = await prisma.questionAttachment.findUnique({ where: { id } });
    if (!attachment) return reply.code(404).send({ message: 'Attachment not found' });

    // Delete file from disk
    try {
      unlinkSync(resolve(uploadsDir, attachment.path));
    } catch { /* file may already be gone */ }

    await prisma.questionAttachment.delete({ where: { id } });
    return reply.code(204).send();
  });
}
