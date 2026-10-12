import React, { useState } from 'react';
import { Box, Card, Text } from 'grommet';
import { useNavigate } from 'react-router-dom';

export interface HomepageBlogItem {
  id: number;
  title: string;
  summary: string;
  content?: string;
  author_name?: string;
  created_at?: string;
  images?: Array<{ image_url: string }>;
  comments?: Array<any>;
  reaction_counts?: {
    likes: number;
    dislikes: number;
  };
  is_new?: boolean;
}

interface BlogSummarySectionProps {
  newestBlog: HomepageBlogItem | null;
  popularBlogs: HomepageBlogItem[];
  isLoggedIn: boolean;
}

export const BlogSummarySection: React.FC<BlogSummarySectionProps> = ({
  newestBlog,
  popularBlogs,
  isLoggedIn,
}) => {
  const navigate = useNavigate();
  const [hoveredId, setHoveredId] = useState<number | null>(null);

  return (
    <Box gap="medium">
      <Box direction="row" justify="between" align="baseline">
        <Box>
          <Text size="large" weight="bold">
            From The Keepsake Journal
          </Text>
          <Text size="small" color="dark-4">
            Inspiration, wedding craft ideas, and our latest journal entries
          </Text>
        </Box>
        <Text
          size="small"
          color="brand"
          style={{ cursor: 'pointer', fontWeight: 600, textDecoration: 'underline' }}
          onClick={() => navigate('/Blog')}
        >
          View all posts →
        </Text>
      </Box>

      <Box direction="column" gap="medium">
        {/* Newest blog panel (Featured) */}
        <Box flex={{ grow: 0, shrink: 0 }}>
          <Text size="medium" weight="bold" margin={{ bottom: 'xsmall' }}>
            Latest Post
          </Text>
          {newestBlog ? (
            <Card
              background="white"
              pad="medium"
              round="small"
              border={{ color: '#f0e6ec', size: 'xsmall' }}
              onClick={() => navigate(`/Blog/${newestBlog.id}`)}
              style={{
                cursor: 'pointer',
                boxShadow: hoveredId === newestBlog.id
                  ? '0px 8px 20px rgba(0, 0, 0, 0.12)'
                  : '0px 2px 8px rgba(0, 0, 0, 0.05)',
                transform: hoveredId === newestBlog.id ? 'translateY(-3px)' : 'none',
                transition: 'all 0.25s ease',
                height: '100%',
              }}
              onMouseEnter={() => setHoveredId(newestBlog.id)}
              onMouseLeave={() => setHoveredId(null)}
            >
              {newestBlog.images?.[0]?.image_url && (
                <Box
                  height="180px"
                  round="xsmall"
                  overflow="hidden"
                  margin={{ bottom: 'small' }}
                >
                  <img
                    src={newestBlog.images[0].image_url}
                    alt={newestBlog.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                  />
                </Box>
              )}
              <Box gap="xsmall">
                <Box direction="row" align="center" gap="xsmall" wrap>
                  <Text weight="bold" size="large">
                    {newestBlog.title}
                  </Text>
                  {isLoggedIn && newestBlog.is_new && (
                    <Box
                      pad={{ horizontal: 'xsmall', vertical: '2px' }}
                      round="xsmall"
                      background="#F4C2C2"
                    >
                      <Text size="xsmall" weight="bold" color="dark-1">
                        NEW
                      </Text>
                    </Box>
                  )}
                </Box>
                <Text size="xsmall" color="dark-4">
                  By {newestBlog.author_name || 'Admin'} ·{' '}
                  {newestBlog.created_at
                    ? new Date(newestBlog.created_at).toLocaleDateString()
                    : 'Recently'}
                </Text>
                <Text size="small" color="dark-3" truncate>
                  {newestBlog.summary || newestBlog.content?.slice(0, 160)}
                </Text>
                <Box direction="row" gap="small" margin={{ top: 'xsmall' }}>
                  <Text size="xsmall" color="dark-4">
                    👍 {newestBlog.reaction_counts?.likes || 0}
                  </Text>
                  <Text size="xsmall" color="dark-4">
                    💬 {newestBlog.comments?.length || 0} comments
                  </Text>
                </Box>
              </Box>
            </Card>
          ) : (
            <Box
              pad="medium"
              background="#fbfbfd"
              round="small"
              border={{ color: '#f0e6ec', size: 'xsmall' }}
            >
              <Text color="dark-4">No journal posts yet.</Text>
            </Box>
          )}
        </Box>

        {/* Top 5 popular blogs panel */}
        <Box flex={{ grow: 1, shrink: 1 }} basis="auto">
          <Text size="medium" weight="bold" margin={{ bottom: 'xsmall' }}>
            Popular Reads
          </Text>
          <Box
            background="white"
            round="small"
            border={{ color: '#f0e6ec', size: 'xsmall' }}
            pad="small"
            gap="xsmall"
            style={{
              boxShadow: '0px 2px 8px rgba(0, 0, 0, 0.04)',
              height: '100%',
            }}
          >
            {popularBlogs.length === 0 ? (
              <Box pad="small">
                <Text color="dark-4" size="small">
                  No popular posts to display yet.
                </Text>
              </Box>
            ) : (
              popularBlogs.map((blog, idx) => (
                <Box
                  key={blog.id}
                  pad="xsmall"
                  round="xsmall"
                  direction="row"
                  align="center"
                  gap="small"
                  onClick={() => navigate(`/Blog/${blog.id}`)}
                  style={{
                    cursor: 'pointer',
                    background: hoveredId === blog.id ? '#FFFCC9' : 'transparent',
                    transition: 'background-color 0.2s ease',
                  }}
                  onMouseEnter={() => setHoveredId(blog.id)}
                  onMouseLeave={() => setHoveredId(null)}
                >
                  <Box
                    width="26px"
                    height="26px"
                    round="full"
                    background="#F4C2C2"
                    align="center"
                    justify="center"
                    flex={false}
                  >
                    <Text size="xsmall" weight="bold">
                      {idx + 1}
                    </Text>
                  </Box>

                  <Box flex>
                    <Text size="small" weight="bold" truncate>
                      {blog.title}
                    </Text>
                    <Text size="xsmall" color="dark-4">
                      👍 {blog.reaction_counts?.likes || 0} likes · 💬 {blog.comments?.length || 0} comments
                    </Text>
                  </Box>
                </Box>
              ))
            )}
          </Box>
        </Box>
      </Box>
    </Box>
  );
};

export default BlogSummarySection;
