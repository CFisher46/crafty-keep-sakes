import express from 'express';
import fs from 'fs';
import multer from 'multer';
import path from 'path';
import { db } from '../../ts-common/database';
import { verifyAuthToken, requireRole, getRequestUser } from '../../ts-common/middleware';

const router = express.Router();

const blogImagesDirectory = path.resolve(__dirname, '../../../../client/public/images/blog');

if (!fs.existsSync(blogImagesDirectory)) {
  fs.mkdirSync(blogImagesDirectory, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, blogImagesDirectory);
  },
  filename: (_req, file, cb) => {
    const extension = path.extname(file.originalname);
    const safeName = path
      .basename(file.originalname, extension)
      .replace(/[^a-zA-Z0-9-_]/g, '_');

    cb(null, `${Date.now()}-${safeName}${extension}`);
  },
});

const upload = multer({ storage });

type BlogPostPayload = {
  title?: unknown;
  summary?: unknown;
  content?: unknown;
};

type BlogPostRecord = {
  id: number;
  title: string;
  summary: string;
  content: string;
  author_id?: number;
  created_at?: string;
};

type CountRow = {
  count?: number | string;
};

type InsertResult = {
  insertId?: number;
};

const normalizePostPayload = (body: BlogPostPayload | undefined) => {
  const title = String(body?.title ?? '').trim();
  const summary = String(body?.summary ?? '').trim();
  const content = String(body?.content ?? '').trim();

  if (!title || !content) {
    throw new Error('Title and content are required');
  }

  return {
    title,
    summary: summary || content.slice(0, 180),
    content,
  };
};

router.get('/posts', async (_req, res) => {
  try {
    const [postsRows] = await db.query(
      `SELECT
        bp.id,
        bp.title,
        bp.summary,
        bp.content,
        bp.author_id,
        TRIM(CONCAT(COALESCE(cp.first_name, ''), ' ', COALESCE(cp.last_name, ''))) AS author_name,
        bp.created_at
      FROM blog_posts_v2 bp
      LEFT JOIN customer_profiles_v2 cp ON cp.user_id = bp.author_id
      ORDER BY bp.created_at DESC`
    );

    const posts = Array.isArray(postsRows) ? postsRows : [];

    const withDetails = await Promise.all(
      posts.map(async (post: BlogPostRecord) => {
        const [imagesRows] = await db.query(
          'SELECT id, image_url, sort_order FROM blog_post_images_v2 WHERE post_id = ? ORDER BY sort_order ASC, id ASC',
          [post.id]
        );

        const [commentsRows] = await db.query(
          `SELECT
            bc.id,
            bc.user_id,
            TRIM(CONCAT(COALESCE(cp.first_name, ''), ' ', COALESCE(cp.last_name, ''))) AS user_name,
            bc.comment,
            bc.created_at
          FROM blog_post_comments_v2 bc
          LEFT JOIN customer_profiles_v2 cp ON cp.user_id = bc.user_id
          WHERE bc.post_id = ?
          ORDER BY bc.created_at DESC`,
          [post.id]
        );

        const [likeRows] = await db.query(
          'SELECT COUNT(*) AS count FROM blog_post_reactions_v2 WHERE post_id = ? AND reaction_type = ' + "'like'",
          [post.id]
        );

        const [dislikeRows] = await db.query(
          'SELECT COUNT(*) AS count FROM blog_post_reactions_v2 WHERE post_id = ? AND reaction_type = ' + "'dislike'",
          [post.id]
        );

        const likeCount = Number((Array.isArray(likeRows) ? (likeRows[0] as CountRow | undefined) : undefined)?.count ?? 0);
        const dislikeCount = Number((Array.isArray(dislikeRows) ? (dislikeRows[0] as CountRow | undefined) : undefined)?.count ?? 0);

        return {
          ...post,
          images: Array.isArray(imagesRows) ? imagesRows : [],
          comments: Array.isArray(commentsRows) ? commentsRows : [],
          reaction_counts: {
            likes: likeCount,
            dislikes: dislikeCount,
          },
        };
      })
    );

    res.json({ data: withDetails });
  } catch (error) {
    console.error('Blog posts read error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/posts', verifyAuthToken, requireRole('admin'), upload.array('images'), async (req, res) => {
  console.log('POST /api/v2/blog/posts');

  try {
    const payload = normalizePostPayload(req.body);
    const files = Array.isArray(req.files) ? req.files : [];

    const [insertResult] = await db.query(
      'INSERT INTO blog_posts_v2 (title, summary, content, author_id) VALUES (?, ?, ?, ?)',
      [payload.title, payload.summary, payload.content, Number(getRequestUser(req)?.id ?? 0)]
    );

    const postId = (insertResult as InsertResult | undefined)?.insertId ?? 0;

    if (files.length) {
      await Promise.all(
        files.map((file, index) =>
          db.query(
            'INSERT INTO blog_post_images_v2 (post_id, image_url, sort_order) VALUES (?, ?, ?)',
            [postId, `/images/blog/${file.filename}`, index + 1]
          )
        )
      );
    }

    const [postRows] = await db.query(
      'SELECT id, title, summary, content, author_id, created_at FROM blog_posts_v2 WHERE id = ?',
      [postId]
    );

    const post = Array.isArray(postRows) && postRows.length ? (postRows[0] as BlogPostRecord | undefined) : null;
    const responsePost = {
      ...(post ?? {}),
      id: post?.id ?? postId,
      title: post?.title ?? payload.title,
      summary: post?.summary ?? payload.summary,
      content: post?.content ?? payload.content,
      author_id: post?.author_id ?? Number(getRequestUser(req)?.id ?? 0),
      created_at: post?.created_at ?? new Date().toISOString(),
      images: files.map((file, index) => ({
        id: null,
        image_url: `/images/blog/${file.filename}`,
        sort_order: index + 1,
      })),
    };

    res.status(201).json({
      message: 'Blog post created',
      post: responsePost,
    });
  } catch (error) {
    console.error('Create blog post error:', error);
    res.status(400).json({ error: error instanceof Error ? error.message : 'Unable to create blog post' });
  }
});

router.post('/posts/:id/comments', verifyAuthToken, async (req, res) => {
  const postId = Number(req.params.id);
  const user = getRequestUser(req);
  const message = String(req.body?.message ?? '').trim();

  if (!Number.isFinite(postId) || postId <= 0) {
    res.status(400).json({ error: 'Invalid post id' });
    return;
  }

  if (!message) {
    res.status(400).json({ error: 'Comment message is required' });
    return;
  }

  try {
    const [insertResult] = await db.query(
      'INSERT INTO blog_post_comments_v2 (post_id, user_id, comment) VALUES (?, ?, ?)',
      [postId, Number(user?.id ?? 0), message]
    );

    res.status(201).json({
      message: 'Comment added',
      comment: {
        id: (insertResult as InsertResult | undefined)?.insertId,
        post_id: postId,
        user_id: Number(user?.id ?? 0),
        comment: message,
      },
    });
  } catch (error) {
    console.error('Add blog comment error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/posts/:id/reactions', verifyAuthToken, async (req, res) => {
  const postId = Number(req.params.id);
  const user = getRequestUser(req);
  const reactionType = String(req.body?.type ?? '').toLowerCase();

  if (!Number.isFinite(postId) || postId <= 0) {
    res.status(400).json({ error: 'Invalid post id' });
    return;
  }

  if (!['like', 'dislike'].includes(reactionType)) {
    res.status(400).json({ error: 'Reaction type must be like or dislike' });
    return;
  }

  try {
    const [existingRows] = await db.query(
      'SELECT id, reaction_type FROM blog_post_reactions_v2 WHERE post_id = ? AND user_id = ?',
      [postId, Number(user?.id ?? 0)]
    );

    type ExistingReactionRow = { id?: number; reaction_type?: string };
    const existingRowsList = Array.isArray(existingRows) ? (existingRows as ExistingReactionRow[]) : [];
    const existing = existingRowsList[0] ?? null;

    if (existing && existing.reaction_type === reactionType) {
      res.status(200).json({
        message: 'Reaction recorded',
        reaction: { post_id: postId, user_id: Number(user?.id ?? 0), type: reactionType },
      });
      return;
    }

    if (existing) {
      await db.query(
        'UPDATE blog_post_reactions_v2 SET reaction_type = ? WHERE id = ?',
        [reactionType, existing.id]
      );
    } else {
      await db.query(
        'INSERT INTO blog_post_reactions_v2 (post_id, user_id, reaction_type) VALUES (?, ?, ?)',
        [postId, Number(user?.id ?? 0), reactionType]
      );
    }

    res.status(201).json({
      message: 'Reaction recorded',
      reaction: { post_id: postId, user_id: Number(user?.id ?? 0), type: reactionType },
    });
  } catch (error) {
    console.error('Blog reaction error:', error);
    res.status(500).json({ error: 'Database error' });
  }
});

router.post('/posts/:id/images/upload', verifyAuthToken, requireRole('admin'), upload.array('images'), async (req, res) => {
  const postId = Number(req.params.id);
  const files = Array.isArray(req.files) ? req.files : [];

  if (!Number.isFinite(postId) || postId <= 0) {
    res.status(400).json({ error: 'Invalid post id' });
    return;
  }

  if (!files.length) {
    res.status(400).json({ error: 'No images were uploaded' });
    return;
  }

  try {
    const [existingRows] = await db.query('SELECT id FROM blog_posts_v2 WHERE id = ?', [postId]);

    if (!Array.isArray(existingRows) || !existingRows.length) {
      res.status(404).json({ error: 'Blog post not found' });
      return;
    }

    const imageRecords = files.map((file, index) => [postId, `/images/blog/${file.filename}`, index + 1]);

    await Promise.all(
      imageRecords.map(([post_id, image_url, sort_order]) =>
        db.query(
          'INSERT INTO blog_post_images_v2 (post_id, image_url, sort_order) VALUES (?, ?, ?)',
          [post_id, image_url, sort_order]
        )
      )
    );

    res.status(201).json({
      message: 'Images added to blog post',
      images: imageRecords.map(([post_id, image_url, sort_order]) => ({
        post_id,
        image_url,
        sort_order,
      })),
    });
  } catch (error) {
    console.error('Blog image upload error:', error);
    res.status(500).json({ error: 'Failed to upload blog images' });
  }
});

export default router;
