import { useEffect, useMemo, useState } from 'react';
import {
  Box,
  FormField,
  Text,
  TextArea,
  TextInput,
  Image,
  Layer,
} from 'grommet';
import { useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { RootState } from '../../store';
import { buildApiUrl } from '../../api/apiPath';
import { ui } from '../../helpers/theme';
import ActionButton from '../landingPage/components/ActionButton';
import { BLOG_VIEWED_EVENT } from './events';

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
  is_new?: boolean;
  reaction_counts: {
    likes: number;
    dislikes: number;
  };
};

const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleDateString() : 'Recently';

const metaStyle = {
  fontSize: '11px',
  letterSpacing: '0.14em',
  textTransform: 'uppercase' as const,
  color: ui.muted,
};

function NewBadge() {
  return (
    <Box
      pad={{ horizontal: 'xsmall', vertical: '2px' }}
      background={ui.ink}
      align="center"
      justify="center"
      style={{ borderRadius: '2px' }}
    >
      <Text size="xsmall" weight="bold" color="white" style={{ letterSpacing: '0.12em' }}>NEW</Text>
    </Box>
  );
}

function BlogTile({
  post,
  isNew,
  featured,
  onOpen,
}: {
  post: BlogPost;
  isNew: boolean;
  featured?: boolean;
  onOpen: () => void;
}) {
  const [hovered, setHovered] = useState(false);
  const image = post.images?.[0]?.image_url;

  return (
    <div
      role="link"
      tabIndex={0}
      onClick={onOpen}
      onKeyDown={(event) => {
        if (event.key === 'Enter') onOpen();
      }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        gridColumn: featured ? '1 / -1' : undefined,
        display: 'flex',
        flexDirection: featured ? 'row' : 'column',
        flexWrap: featured ? 'wrap' : 'nowrap',
        background: '#fff',
        border: `1px solid ${hovered ? ui.ink : ui.line}`,
        borderRadius: '2px',
        overflow: 'hidden',
        cursor: 'pointer',
        transition: 'border-color 0.2s ease',
      }}
    >
      <div
        style={{
          flex: featured ? '1 1 320px' : '0 0 auto',
          width: featured ? undefined : '100%',
          height: featured ? undefined : '200px',
          flexShrink: 0,
          minHeight: featured ? '280px' : undefined,
          background: ui.sand,
          overflow: 'hidden',
        }}
      >
        {image ? (
          <img
            src={image}
            alt={post.title}
            style={{
              width: '100%',
              height: '100%',
              objectFit: 'cover',
              display: 'block',
              transform: hovered ? 'scale(1.04)' : 'none',
              transition: 'transform 0.5s ease',
            }}
          />
        ) : (
          <Box fill align="center" justify="center">
            <Text color={ui.muted} size="small">No Image</Text>
          </Box>
        )}
      </div>
      <Box
        flex
        style={{ flex: featured ? '1 1 320px' : '1 1 auto', width: featured ? undefined : '100%' }}
        pad={featured ? 'large' : 'medium'}
        gap="small"
        justify={featured ? 'center' : 'start'}
      >
        <Box direction="row" align="center" gap="xsmall" wrap>
          <Text style={metaStyle}>
            {featured ? 'Latest · ' : ''}{formatDate(post.created_at)}
          </Text>
          {isNew && <NewBadge />}
        </Box>
        <Text
          as="div"
          style={{
            fontFamily: ui.serif,
            fontSize: featured ? '32px' : '22px',
            lineHeight: 1.25,
            color: ui.ink,
          }}
        >
          {post.title}
        </Text>
        {post.summary && (
          <Text
            color={ui.muted}
            style={{
              lineHeight: 1.6,
              display: '-webkit-box',
              WebkitLineClamp: featured ? 4 : 3,
              WebkitBoxOrient: 'vertical',
              overflow: 'hidden',
            }}
          >
            {post.summary}
          </Text>
        )}
        <Text size="small" color={ui.muted}>
          By {post.author_name || 'Unknown author'}
        </Text>
        <Text size="small" color={ui.muted}>
          👍 {post.reaction_counts?.likes || 0} · 👎 {post.reaction_counts?.dislikes || 0} · 💬 {post.comments?.length || 0}
        </Text>
      </Box>
    </div>
  );
}

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

  const markPostViewed = async (postId: number) => {
    if (!isLoggedIn) {
      return;
    }

    try {
      const response = await fetch(buildApiUrl('blog', `/posts/${postId}/views`), {
        method: 'POST',
        credentials: 'include',
      });

      if (!response.ok) {
        return;
      }

      window.dispatchEvent(new Event(BLOG_VIEWED_EVENT));

      setPosts((currentPosts) =>
        currentPosts.map((post) =>
          post.id === postId
            ? {
                ...post,
                is_new: false,
              }
            : post
        )
      );
    } catch {
      // No-op: a failed view registration should not block the post from rendering.
    }
  };

  useEffect(() => {
    loadPosts();
  }, []);

  useEffect(() => {
    if (!selectedPost || !isLoggedIn || !selectedPost.is_new) {
      return;
    }

    void markPostViewed(selectedPost.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedPost, isLoggedIn]);

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
    <Box pad="xsmall" gap="medium">
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
              <ActionButton label="Close" secondary fixed onClick={() => setEnlargedImage(null)} />
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
        <Box gap="medium" width={{ max: '820px' }} alignSelf="center" fill="horizontal">
          <Box alignSelf="start">
            <ActionButton label="Back to all blogs" secondary fixed onClick={() => navigate('/Blog')} />
          </Box>

          <Box background="white" pad={{ vertical: 'large', horizontal: 'large' }} gap="medium" style={{ border: `1px solid ${ui.line}`, borderRadius: '2px' }}>
            <Box gap="small">
              <Box direction="row" align="center" gap="xsmall" wrap>
                <Text style={metaStyle}>
                  By {selectedPost.author_name || 'Unknown author'} · {formatDate(selectedPost.created_at)}
                </Text>
                {isLoggedIn && selectedPost.is_new && <NewBadge />}
              </Box>
              <Text as="div" style={{ fontFamily: ui.serif, fontSize: '38px', lineHeight: 1.2, color: ui.ink }}>
                {selectedPost.title}
              </Text>
              {selectedPost.summary && (
                <Text size="large" color={ui.muted} style={{ lineHeight: 1.5 }}>{selectedPost.summary}</Text>
              )}
            </Box>

            {selectedPost.images?.length > 0 && (
              <Box
                height="medium"
                overflow="hidden"
                background={ui.sand}
                onClick={() => openImageModal(selectedPost.images[0].image_url)}
                style={{ cursor: 'pointer', borderRadius: '2px' }}
              >
                <Image
                  src={selectedPost.images[0].image_url}
                  alt={`${selectedPost.title} image 1`}
                  fit="cover"
                />
              </Box>
            )}

            <Text style={{ lineHeight: 1.8, whiteSpace: 'pre-wrap', color: ui.ink }}>{selectedPost.content}</Text>

            {selectedPost.images?.length > 1 && (
              <Box direction="row" wrap gap="xsmall" align="center">
                {selectedPost.images.slice(1).map((image, index) => (
                  <Box
                    key={`${image.image_url}-${index}`}
                    width="96px"
                    height="96px"
                    overflow="hidden"
                    onClick={() => openImageModal(image.image_url)}
                    style={{ cursor: 'pointer', border: `1px solid ${ui.line}`, borderRadius: '2px', flex: '0 0 auto' }}
                  >
                    <Image
                      src={image.image_url}
                      alt={`${selectedPost.title} image ${index + 2}`}
                      fit="cover"
                      style={{ width: '100%', height: '100%', display: 'block' }}
                    />
                  </Box>
                ))}
              </Box>
            )}

            <Box direction="row" gap="small" align="center" style={{ borderTop: `1px solid ${ui.line}` }} pad={{ top: 'medium' }}>
              <ActionButton
                label={`Like (${selectedPost.reaction_counts?.likes || 0})`}
                secondary
                fixed
                onClick={() => handleReaction(selectedPost.id, 'like')}
                disabled={!isLoggedIn || submitting}
              />
              <ActionButton
                label={`Dislike (${selectedPost.reaction_counts?.dislikes || 0})`}
                secondary
                fixed
                onClick={() => handleReaction(selectedPost.id, 'dislike')}
                disabled={!isLoggedIn || submitting}
              />
            </Box>

            <Box gap="small">
              <Text as="div" style={{ fontFamily: ui.serif, fontSize: '22px', color: ui.ink }}>Comments</Text>
              {selectedPost.comments?.length ? (
                selectedPost.comments.map((comment, index) => (
                  <Box key={`${comment.id ?? index}`} pad="small" background={ui.page} gap="xsmall" style={{ border: `1px solid ${ui.line}`, borderRadius: '2px' }}>
                    <Box direction="row" justify="between" align="center" gap="small">
                      <Text size="small" weight="bold">{comment.user_name || 'User'}</Text>
                      <Text size="xsmall" color={ui.muted}>
                        {comment.created_at ? new Date(comment.created_at).toLocaleString() : 'Just now'}
                      </Text>
                    </Box>
                    <Text size="small">{comment.comment}</Text>
                  </Box>
                ))
              ) : (
                <Text size="small" color={ui.muted}>No comments yet.</Text>
              )}
            </Box>

            {isLoggedIn ? (
              <Box direction="row" gap="small" align="center">
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
                <ActionButton
                  label="Post comment"
                  fixed
                  onClick={() => handleCommentSubmit(selectedPost.id)}
                  disabled={submitting}
                />
              </Box>
            ) : (
              <Text size="small" color={ui.muted}>Sign in to comment and react on this post.</Text>
            )}
          </Box>
        </Box>
      ) : (
        <Box gap="medium">
          <Box gap="xxsmall">
            <Text style={metaStyle}>The journal</Text>
            <Text as="h1" margin="none" style={{ fontFamily: ui.serif, fontSize: '36px', fontWeight: 400, color: ui.ink }}>
              {pageTitle}
            </Text>
          </Box>

          {error && (
            <Box pad="small" background="status-error" style={{ borderRadius: '2px' }}>
              <Text color="white">{error}</Text>
            </Box>
          )}

          {isAdmin && (
            <Box align="start">
              <ActionButton label="Create blog post" fixed onClick={() => setShowCreateModal(true)} />
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
                  <ActionButton label="Cancel" secondary fixed onClick={() => setShowCreateModal(false)} />
                  <ActionButton
                    label={submitting ? 'Publishing...' : 'Publish blog post'}
                    fixed
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
            posts.length === 0 ? (
              <Text color={ui.muted}>No blog posts yet.</Text>
            ) : (
              <div
                style={{
                  display: 'grid',
                  gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
                  gap: '24px',
                }}
              >
                {posts.map((post, index) => (
                  <BlogTile
                    key={post.id}
                    post={post}
                    featured={index === 0}
                    isNew={isLoggedIn && Boolean(post.is_new)}
                    onOpen={() => navigate(`/Blog/${post.id}`)}
                  />
                ))}
              </div>
            )
          )}
        </Box>
      )}
    </Box>
  );
}

export default BlogPage;
