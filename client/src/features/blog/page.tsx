import { useEffect, useMemo, useState } from 'react';
import { Box, Button, FormField, Text, TextArea, TextInput, Image, Layer, Card, Grid } from 'grommet';
import { useSelector } from 'react-redux';
import { RootState } from '../../store';
import { buildApiUrl } from '../../api/apiPath';

type BlogImage = {
  id?: number;
  image_url: string;
  sort_order?: number;
};

type BlogComment = {
  id?: number;
  user_name?: string;
  comment: string;
  created_at?: string;
};

type BlogPost = {
  id: number;
  title: string;
  summary: string;
  content: string;
  author_name?: string;
  created_at?: string;
  images: BlogImage[];
  comments: BlogComment[];
  reaction_counts: {
    likes: number;
    dislikes: number;
  };
};

const emptyPostForm = {
  title: '',
  summary: '',
  content: '',
};

function BlogPage() {
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.type?.toLowerCase() === 'admin';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadPosts = async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('blog', '/posts'), {
        credentials: 'include',
      });

      if (!response.ok) {
        throw new Error('Failed to load blog posts');
      }

      const data = await response.json();
      setPosts(Array.isArray(data.data) ? data.data : []);
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Unable to load blog posts');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  const handleCreatePost = async () => {
    if (!postForm.title.trim() || !postForm.content.trim()) {
      setError('Title and content are required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append('title', postForm.title.trim());
      formData.append('summary', postForm.summary.trim());
      formData.append('content', postForm.content.trim());

      selectedImages.forEach((image) => formData.append('images', image));

      const response = await fetch(buildApiUrl('blog', '/posts'), {
        method: 'POST',
        credentials: 'include',
        body: formData,
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to create blog post');
      }

      setPostForm(emptyPostForm);
      setSelectedImages([]);
      await loadPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to create blog post');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCommentSubmit = async (postId: number) => {
    const draft = (commentDrafts[postId] || '').trim();
    if (!draft) {
      setError('Comment cannot be empty');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('blog', `/posts/${postId}/comments`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: draft }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to add comment');
      }

      setCommentDrafts((current) => ({ ...current, [postId]: '' }));
      await loadPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to add comment');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReaction = async (postId: number, type: 'like' | 'dislike') => {
    if (!isLoggedIn) {
      setError('Please sign in to react to posts');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const response = await fetch(buildApiUrl('blog', `/posts/${postId}/reactions`), {
        method: 'POST',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type }),
      });

      const payload = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(payload?.error || 'Unable to record reaction');
      }

      await loadPosts();
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Unable to record reaction');
    } finally {
      setSubmitting(false);
    }
  };

  const pageTitle = useMemo(() => (isAdmin ? 'Blog admin' : 'Blog'), [isAdmin]);

  return (
    <Box pad="medium" gap="medium">
      <Text size="xlarge" weight="bold">{pageTitle}</Text>

      {error && (
        <Box pad="small" background="status-error" round="xsmall">
          <Text color="white">{error}</Text>
        </Box>
      )}

      {isAdmin && (
        <Card pad="medium" background="light-1" round="small" elevation="small">
          <Text size="large" weight="bold">Create a new blog post</Text>
          <Box gap="small" margin={{ top: 'small' }}>
            <FormField label="Title">
              <TextInput
                value={postForm.title}
                onChange={(event) => setPostForm((current) => ({ ...current, title: event.target.value }))}
              />
            </FormField>

            <FormField label="Summary">
              <TextInput
                value={postForm.summary}
                onChange={(event) => setPostForm((current) => ({ ...current, summary: event.target.value }))}
              />
            </FormField>

            <FormField label="Content">
              <TextArea
                value={postForm.content}
                onChange={(event) => setPostForm((current) => ({ ...current, content: event.target.value }))}
                rows={6}
              />
            </FormField>

            <FormField label="Images">
              <input
                type="file"
                multiple
                accept="image/*"
                onChange={(event) => setSelectedImages(Array.from(event.target.files || []))}
              />
            </FormField>

            <Button
              label={submitting ? 'Publishing...' : 'Publish blog post'}
              primary
              disabled={submitting}
              onClick={handleCreatePost}
            />
          </Box>
        </Card>
      )}

      {loading ? (
        <Text>Loading blog posts...</Text>
      ) : (
        <Box gap="medium">
          {posts.map((post) => (
            <Card key={post.id} pad="medium" background="white" round="small" elevation="small">
              <Box gap="small">
                <Text size="large" weight="bold">{post.title}</Text>
                <Text size="small" color="dark-3">
                  By {post.author_name || 'Unknown author'} · {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Recently'}
                </Text>
                {post.summary && <Text>{post.summary}</Text>}
                <Text>{post.content}</Text>

                {post.images?.length > 0 && (
                  <Grid columns={{ count: Math.min(post.images.length, 3), size: 'small' }} gap="small">
                    {post.images.map((image, index) => (
                      <Box key={`${image.image_url}-${index}`} height="180px" overflow="hidden" round="xsmall">
                        <Image src={image.image_url} alt={`${post.title} image ${index + 1}`} fit="cover" />
                      </Box>
                    ))}
                  </Grid>
                )}

                <Box direction="row" gap="small" align="center">
                  <Button
                    label={`Like (${post.reaction_counts?.likes || 0})`}
                    onClick={() => handleReaction(post.id, 'like')}
                    disabled={!isLoggedIn || submitting}
                  />
                  <Button
                    label={`Dislike (${post.reaction_counts?.dislikes || 0})`}
                    onClick={() => handleReaction(post.id, 'dislike')}
                    disabled={!isLoggedIn || submitting}
                  />
                </Box>

                <Box gap="small" pad={{ top: 'small' }}>
                  <Text weight="bold">Comments</Text>
                  {post.comments?.length ? (
                    post.comments.map((comment, index) => (
                      <Box key={`${comment.id ?? index}`} pad="small" background="light-2" round="xsmall">
                        <Text size="small" weight="bold">{comment.user_name || 'User'}</Text>
                        <Text size="small">{comment.comment}</Text>
                      </Box>
                    ))
                  ) : (
                    <Text size="small" color="dark-3">No comments yet.</Text>
                  )}
                </Box>

                {isLoggedIn ? (
                  <Box direction="row" gap="small" align="center" margin={{ top: 'small' }}>
                    <TextInput
                      placeholder="Add a comment"
                      value={commentDrafts[post.id] || ''}
                      onChange={(event) =>
                        setCommentDrafts((current) => ({
                          ...current,
                          [post.id]: event.target.value,
                        }))
                      }
                    />
                    <Button
                      label="Post comment"
                      onClick={() => handleCommentSubmit(post.id)}
                      disabled={submitting}
                    />
                  </Box>
                ) : (
                  <Text size="small" color="dark-3">Sign in to comment and react on this post.</Text>
                )}
              </Box>
            </Card>
          ))}
        </Box>
      )}
    </Box>
  );
}

export default BlogPage;
