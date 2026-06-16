import { request, response } from "express";

const asyncHandler = async (requestHandler) => {
  try {
    return await Promise.resolve(requestHandler(request, response, next));
  } catch (error) {
    next(error);
  }
};

export { asyncHandler };

// const asyncHandler = () => {}
// const asyncHandler = (func) => () => {}
// const asyncHandler = (func) => async () => {}

// const asyncHandler = (fn) => async (req, res, next) => {
//     try {
//         await fn(req, res, next)
//     } catch (error) {
//         res.status(err.code || 500).json({
//             success: false,
//             message: err.message
//         })
//     }
// }
