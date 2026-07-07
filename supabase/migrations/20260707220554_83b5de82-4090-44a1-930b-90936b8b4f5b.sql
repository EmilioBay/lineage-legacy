
REVOKE ALL ON FUNCTION public.create_token_promotion(UUID, public.promotion_type, INTEGER, INTEGER) FROM PUBLIC;
REVOKE ALL ON FUNCTION public.create_token_promotion(UUID, public.promotion_type, INTEGER, INTEGER) FROM anon;
GRANT EXECUTE ON FUNCTION public.create_token_promotion(UUID, public.promotion_type, INTEGER, INTEGER) TO authenticated;
