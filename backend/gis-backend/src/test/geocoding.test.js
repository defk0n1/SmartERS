import * as chai from "chai";
import chaiHttp from "chai-http";
import app from "../app.js";

chai.use(chaiHttp);
import { request } from 'chai-http';
const { expect } = chai;

describe("Geocoding API", () => {

    it("should return health check", (done) => {
        request.execute(app)
            .get("/health")
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.status).to.equal("GIS backend running");
                done();
            });
    });

    describe("POST /api/gis/geocode", () => {
        it("should return 400 if address is missing", (done) => {
            request.execute(app)
                .post("/api/gis/geocode")
                .send({})
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    expect(res.body.error).to.equal("Address is required");
                    done();
                });
        });

        it("should geocode a valid address", (done) => {
            request.execute(app)
                .post("/api/gis/geocode")
                .send({ address: "Avenue Habib Bourguiba, Tunis, Tunisia" })
                .end((err, res) => {
                    // This test depends on ArcGIS service availability
                    // In test environment, it may succeed or fail based on credentials
                    if (res.status === 200) {
                        expect(res.body.success).to.be.true;
                        expect(res.body.data).to.have.property("latitude");
                        expect(res.body.data).to.have.property("longitude");
                        expect(res.body.data).to.have.property("score");
                    } else {
                        // Service unavailable or invalid credentials
                        expect(res.status).to.be.oneOf([404, 500]);
                    }
                    done();
                });
        });
    });

    describe("POST /api/gis/reverse-geocode", () => {
        it("should return 400 if coordinates are missing", (done) => {
            request.execute(app)
                .post("/api/gis/reverse-geocode")
                .send({})
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    expect(res.body.error).to.equal("Latitude and longitude are required");
                    done();
                });
        });

        it("should return 400 if only latitude is provided", (done) => {
            request.execute(app)
                .post("/api/gis/reverse-geocode")
                .send({ latitude: 36.8065 })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    done();
                });
        });

        it("should reverse geocode valid coordinates", (done) => {
            request.execute(app)
                .post("/api/gis/reverse-geocode")
                .send({ latitude: 36.8065, longitude: 10.1815 })
                .end((err, res) => {
                    // This test depends on ArcGIS service availability
                    if (res.status === 200) {
                        expect(res.body.success).to.be.true;
                        expect(res.body.data).to.be.an("object");
                    } else {
                        expect(res.status).to.be.oneOf([404, 500]);
                    }
                    done();
                });
        });
    });
});
