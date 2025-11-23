import * as chai from "chai";       
import chaiHttp from "chai-http";
import mongoose from "mongoose";
import app from "../app.js";
import Ambulance from "../models/Ambulance.js";

chai.use(chaiHttp);
import {request} from 'chai-http';
const { expect } = chai;

describe("Ambulance API", () => {
  before(async () => {
    await mongoose.connect(process.env.MONGO_URI);
  });

  after(async () => {
    await Ambulance.deleteMany({});
    await mongoose.connection.close();
  });

  let ambulanceId;

  it("should create a new ambulance", (done) => {
    request.execute(app)
      .post("/api/ambulances")
      .send({
        plateNumber: "AB-1234",
        driver: null,
        status: "available",
        location: { lat: 0, lng: 0 }
      })
      .end((err, res) => {
        expect(res).to.have.status(201);
        expect(res.body).to.have.property("_id");
        ambulanceId = res.body._id;
        done();
      });
  });

  it("should get all ambulances", (done) => {
    request.execute(app)
      .get("/api/ambulances")
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.be.an("array");
        done();
      });
  });

  it("should get ambulance by id", (done) => {
    request.execute(app)
      .get(`/api/ambulances/${ambulanceId}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body).to.have.property("_id", ambulanceId);
        done();
      });
  });

  it("should update an ambulance", (done) => {
    request.execute(app)
      .put(`/api/ambulances/${ambulanceId}`)
      .send({ status: "busy" })
      .end((err, res) => {
        expect(res).to.have.status(200);
        expect(res.body.status).to.equal("busy");
        done();
      });
  });

  it("should delete an ambulance", (done) => {
    request.execute(app)
      .delete(`/api/ambulances/${ambulanceId}`)
      .end((err, res) => {
        expect(res).to.have.status(200);
        done();
      });
  });
});
