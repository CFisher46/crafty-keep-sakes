import { Box } from 'grommet';
import ReviewsPage from './feedback/page';
import IntroductionsPage from './introductions/page';

export default function ReviewsOverviewPage() {
  return (
    <Box width={{ max: '820px' }} alignSelf="center" fill="horizontal" gap="small">
      <IntroductionsPage />
      <ReviewsPage />
    </Box>
  );
}
