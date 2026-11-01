import ReportView, { ReportColumn } from './ReportView';
import { HorizontalBarChart } from '../charts';

interface BlogRow {
  title: string;
  author: string | null;
  created_at: string | null;
  viewers: number;
  comments: number;
  likes: number;
  dislikes: number;
  engagement: number;
}

const columns: ReportColumn<BlogRow>[] = [
  { key: 'title', label: 'Post', value: (row) => row.title },
  { key: 'author', label: 'Author', value: (row) => row.author ?? '' },
  { key: 'published', label: 'Published', value: (row) => (row.created_at ? new Date(row.created_at).toLocaleDateString('en-GB') : '') },
  { key: 'viewers', label: 'Readers', numeric: true, value: (row) => row.viewers },
  { key: 'comments', label: 'Comments', numeric: true, value: (row) => row.comments },
  { key: 'likes', label: 'Likes', numeric: true, value: (row) => row.likes },
  { key: 'dislikes', label: 'Dislikes', numeric: true, value: (row) => row.dislikes },
  { key: 'engagement', label: 'Engagement', numeric: true, value: (row) => row.engagement },
];

const extractRows = (data: unknown) => data as BlogRow[];

const renderCharts = (rows: BlogRow[]) => (
  <>
    <HorizontalBarChart
      title="Most engaged posts"
      data={rows.slice(0, 10).map((row) => ({ label: row.title, value: row.engagement }))}
      emptyMessage="No activity in this period."
    />
    <HorizontalBarChart
      title="Most read posts"
      data={[...rows]
        .sort((a, b) => b.viewers - a.viewers)
        .slice(0, 10)
        .map((row) => ({ label: row.title, value: row.viewers }))}
      emptyMessage="No reads in this period."
    />
  </>
);

export default function BlogReportPage() {
  return (
    <ReportView<BlogRow>
      title="Blog stats"
      description="Readers, comments and reactions per post, most engaged first."
      endpoint="/blog"
      filename="blog-stats"
      columns={columns}
      extractRows={extractRows}
      renderCharts={renderCharts}
      dateHint="Dates filter the activity (reads, comments, reactions), not when the post was published. Readers counts each signed-in user once, by their latest visit."
    />
  );
}
