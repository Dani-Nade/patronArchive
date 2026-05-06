export default function errorHandler(err, _req, res, _next) {
  console.error('[error]', err.message);
  res.status(err.status || 500).json({
    success: false,
    error: err.message || 'Internal server error',
  });
}
