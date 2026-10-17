import { Box, Text } from "grommet";
export default function ReviewsPage() {
    return (
        <Box pad="medium">
            <Text>Customer Feedback</Text>

            <Text>We value your feedback and strive to improve our services based on your input.</Text>
            <Text>Here's what our customers have had to say:</Text>
            <Box pad="small" background="light-2" round="small" gap="small">
                <Text>"My amazing new business supplies from the lovely
                    Nicola at crafty Keppsakes.

                    Highly recommend this lady, she was a pleasure to
                    work with, and very quick turnaround too.” - Chantel

                    5th June 2026

                    Pet Pawtraits by Chantel</Text>
            </Box>
            <Box pad="small" background="light-2" round="small" gap="small">

                <Text>“Just want to give credit where credit is due!

                    I had a place name issue with canva where all my
                    place names came with the same name on. Crafty
                    Keepsakes saved my life and sorted this issue out
                    very quickly! My wedding is now just 10 days away.
                    The communication was amazing, she updated me
                    CONSTANTLY about my order. My order arrived
                    today and I could not be happier! I would 1000%
                    recommend! Such a lovely lady who genuinely cares
                    about her customers!!” - Hannah Lawton

                    15th May 2026

                    Wedding DIY UK</Text>
            </Box>

            <Box pad="small" background="light-2" round="small" gap="small">

                <Text>“I honestly can’t recommend Crafty Keepsakes
                    enough. The communication was amazing, and
                    the attention to detail was everything you’d hope
                    for in wedding stationery.

                    With a busy job and not a creative bone in my
                    body, this was hands down, the best money I
                    spent. Thank you so much!” - Freya Jennifer

                    2nd February 2026, Facebook</Text>
            </Box>
        </Box >

    );
}