export type Review = {
  id: number;
  reviewer_name: string;
  source: string;
  star_count: number;
  comment: string;
  submit_date: Date | string;
};

export type ReviewInput = Omit<Review, 'id'>;