import routingService from "../services/routingService.js";

export async function getRoute(req, res) {
  try {
    const { start, end } = req.body;

    if (!start || !end) {
      return res.status(400).json({
        error: "start and end fields required"
      });
    }

    const data = await routingService.getOptimalRoute(start, end);

    res.json({
      success: true,
      ...data
    });

  } catch (err) {
    res.status(500).json({
      success: false,
      error: err.message
    });
  }
}
