import type { Request, Response, NextFunction } from "express";
import { ZodTypeAny } from "zod";
export const validate=(schema:ZodTypeAny)=>(req:Request,res:Response,next:NextFunction)=>{
  const p=schema.safeParse({body:req.body,query:req.query,params:req.params,headers:req.headers});
  if(!p.success) return res.status(400).json({error:"bad_request",details:p.error.flatten()});
  // @ts-ignore
  req.z=p.data; next();
};
