import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  Button,
  FormField,
  Text,
  TextArea,
  TextInput,
  Image,
  Card,
  Table,
  TableBody,
  TableCell,
  TableHeader,
  TableRow,
  Layer,
} from 'grommet';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
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
  const navigate = useNavigate();
  const { id } = useParams();
  const isLoggedIn = useSelector((state: RootState) => state.auth.isLoggedIn);
  const user = useSelector((state: RootState) => state.auth.user);
  const isAdmin = user?.type?.toLowerCase() === 'admin';

  const [posts, setPosts] = useState<BlogPost[]>([]);
  const [loading, setLoading] = useState(false);
  const [postForm, setPostForm] = useState(emptyPostForm);
  const [selectedImages, setSelectedImages] = useState<File[]>([]);
  const [commentDrafts, setCommentDrafts] = useState<Record<number, string>>({});
  const [submitting, setSubmitting] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [enlargedImage, setEnlargedImage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const selectedPostId = id ? Number(id) : null;
  const selectedPost = useMemo(
    () => posts.find((post) => post.id === selectedPostId) ?? null,
    [posts, selectedPostId]
  );

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
      setShowCreateModal(false);
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
  const openImageModal = (imageUrl: string) => setEnlargedImage(imageUrl);

  return (
    <Box pad="medium" gap="medium">
      {enlargedImage && (
        <Layer
          onEsc={() => setEnlargedImage(null)}
          onClickOutside={() => setEnlargedImage(null)}
          position="center"
          full={false}
        >
          <Box
            pad="small"
            align="center"
            gap="small"
            style={{
              maxWidth: '700px',
              maxHeight: '80vh',
              width: 'min(700px, 80vw)',
              overflow: 'auto',
              background: '#fff',
            }}
          >
            <Box alignSelf="end">
              <Button label="Close" onClick={() => setEnlargedImage(null)} />
            </Box>
            <Image
              src={enlargedImage}
              alt="Enlarged blog post"
              fit="contain"
              style={{
                display: 'block',
                width: '100%',
                maxWidth: '680px',
                maxHeight: '75vh',
                height: 'auto',
                objectFit: 'contain',
              }}
            />
          </Box>
        </Layer>
      )}

      {selectedPostId && selectedPost ? (
        <Box pad="medium" gap="medium">
          <Button label="Back to all blogs" onClick={() => navigate('/Blog')} alignSelf="start" />

          <Card pad="medium" background="white" round="small" elevation="small">
            <Box gap="small">
              <Text size="xlarge" weight="bold">{selectedPost.title}</Text>
              <Text size="small" color="dark-3">
                By {selectedPost.author_name || 'Unknown author'} ·{' '}
                {selectedPost.created_at ? new Date(selectedPost.created_at).toLocaleDateString() : 'Recently'}
              </Text>

              {selectedPost.summary && <Text>{selectedPost.summary}</Text>}
              <Text>{selectedPost.content}</Text>

              {selectedPost.images?.length > 0 && (
                <Box direction="row" wrap gap="4px" align="center">
                  {selectedPost.images.map((image, index) => (
                    <Box
                      key={`${image.image_url}-${index}`}
                      width="48px"
                      height="48px"
                      overflow="hidden"
                      round="xsmall"
                      onClick={() => openImageModal(image.image_url)}
                      style={{
                        cursor: 'pointer',
                        position: 'relative',
                        transition: 'transform 0.2s ease-in-out',
                        boxShadow: '0 1px 3px rgba(0,0,0,0.12)',
                        pointerEvents: 'auto',
                        margin: 0,
                        flex: '0 0 auto',
                        display: 'inline-block',
                      }}
                    >
                      <Image
                        src={image.image_url}
                        alt={`${selectedPost.title} image ${index + 1}`}
                        fit="cover"
                        onClick={() => openImageModal(image.image_url)}
                        style={{
                          width: '100%',
                          height: '100%',
                          cursor: 'pointer',
                          display: 'block',
                        }}
                      />
                    </Box>
                  ))}
                </Box>
              )}

              <Box direction="row" gap="small" align="center">
                <Button
                  label={`Like (${selectedPost.reaction_counts?.likes || 0})`}
                  onClick={() => handleReaction(selectedPost.id, 'like')}
                  disabled={!isLoggedIn || submitting}
                />
                <Button
                  label={`Dislike (${selectedPost.reaction_counts?.dislikes || 0})`}
                  onClick={() => handleReaction(selectedPost.id, 'dislike')}
                  disabled={!isLoggedIn || submitting}
                />
              </Box>

              <Box gap="small" pad={{ top: 'small' }}>
                <Text weight="bold">Comments</Text>
                {selectedPost.comments?.length ? (
                  selectedPost.comments.map((comment, index) => (
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
                    value={commentDrafts[selectedPost.id] || ''}
                    onChange={(event) =>
                      setCommentDrafts((current) => ({
                        ...current,
                        [selectedPost.id]: event.target.value,
                      }))
                    }
                  />
                  <Button
                    label="Post comment"
                    onClick={() => handleCommentSubmit(selectedPost.id)}
                    disabled={submitting}
                  />
                </Box>
              ) : (
                <Text size="small" color="dark-3">Sign in to comment and react on this post.</Text>
              )}
            </Box>
          </Card>
        </Box>
      ) : (
        <Box pad="medium" gap="medium">
          <Text size="xlarge" weight="bold">{pageTitle}</Text>

          {error && (
            <Box pad="small" background="status-error" round="xsmall">
              <Text color="white">{error}</Text>
            </Box>
          )}

          {isAdmin && (
            <Box align="start">
              <Button label="Create blog post" primary onClick={() => setShowCreateModal(true)} />
            </Box>
          )}

          {showCreateModal && (
            <Layer
              onEsc={() => setShowCreateModal(false)}
              onClickOutside={() => setShowCreateModal(false)}
              position="center"
            >
              <Box pad="medium" width="large" gap="small">
                <Text size="large" weight="bold">Create a new blog post</Text>

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
                    onChange={(event) => {
                      const nextFiles = Array.from(event.target.files || []);
                      setSelectedImages((current) => [...current, ...nextFiles]);
                      event.target.value = '';
                    }}
                  />
                  {selectedImages.length > 0 && (
                    <Box pad={{ top: 'xsmall' }} gap="xxsmall">
                      <Text size="small" weight="bold">Selected images ({selectedImages.length})</Text>
                      {selectedImages.map((image, index) => (
                        <Text key={`${image.name}-${index}`} size="small" color="dark-3">
                          • {image.name}
                        </Text>
                      ))}
                    </Box>
                  )}
                </FormField>

                <Box direction="row" gap="small" justify="end">
                  <Button label="Cancel" onClick={() => setShowCreateModal(false)} />
                  <Button
                    label={submitting ? 'Publishing...' : 'Publish blog post'}
                    primary
                    disabled={submitting}
                    onClick={handleCreatePost}
                  />
                </Box>
              </Box>
            </Layer>
          )}

          {loading ? (
            <Text>Loading blog posts...</Text>
          ) : (
            <Card pad="small" background="white" round="small" elevation="small">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableCell scope="col">Title</TableCell>
                    <TableCell scope="col">Posted</TableCell>
                    <TableCell scope="col">Likes</TableCell>
                    <TableCell scope="col">Dislikes</TableCell>
                    <TableCell scope="col">Comments</TableCell>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {posts.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5}>
                        <Text color="dark-3">No blog posts yet.</Text>
                      </TableCell>
                    </TableRow>
                  ) : (
                    posts.map((post) => (
                      <TableRow
                        key={post.id}
                        onClick={() => navigate(`/Blog/${post.id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <TableCell>
                          <Text weight="bold">{post.title}</Text>
                        </TableCell>
                        <TableCell>
                          {post.created_at ? new Date(post.created_at).toLocaleDateString() : 'Recently'}
                        </TableCell>
                        <TableCell>{post.reaction_counts?.likes || 0}</TableCell>
                        <TableCell>{post.reaction_counts?.dislikes || 0}</TableCell>
                        <TableCell>{post.comments?.length || 0}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </Card>
          )}
        </Box>
      )}
    </Box>
  );
}

export default BlogPage;
