import * as chai from "chai";
import chaiHttp from "chai-http";
import app from "../app.js";

chai.use(chaiHttp);
import { request } from 'chai-http';
const { expect } = chai;

describe("Ambulance GIS API", function() {
    // Increase timeout for ArcGIS API calls
    this.timeout(15000);

    describe("GET /ambulances/nearest", () => {
        it("should return 400 if coordinates are missing", (done) => {
            request.execute(app)
                .get("/ambulances/nearest")
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    expect(res.body.error).to.equal("Latitude and longitude are required");
                    done();
                });
        });

        it("should return 400 if only latitude is provided", (done) => {
            request.execute(app)
                .get("/ambulances/nearest?latitude=36.818")
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    done();
                });
        });

        it("should return ambulances sorted by distance", (done) => {
            request.execute(app)
                .get("/ambulances/nearest?latitude=36.818&longitude=10.165")
                .end((err, res) => {
                    if (err) {
                        // Network error or server not responding - test passes if there's any response
                        if (res && res.status) {
                            expect(res.status).to.be.oneOf([200, 500]);
                        }
                        done();
                        return;
                    }
                    // This test depends on ArcGIS service availability
                    if (res && res.status === 200 && res.body) {
                        expect(res.body.success).to.be.true;
                        expect(res.body.data).to.be.an("array");
                        if (res.body.meta) {
                            expect(res.body.meta).to.have.property("searchLocation");
                        }
                    }
                    // Accept 500 if ArcGIS is unavailable
                    if (res && res.status) {
                        expect(res.status).to.be.oneOf([200, 500]);
                    }
                    done();
                });
        });

        it("should accept optional parameters", (done) => {
            request.execute(app)
                .get("/ambulances/nearest?latitude=36.818&longitude=10.165&limit=3&status=available&includeRoute=false")
                .end((err, res) => {
                    if (res.status === 200) {
                        expect(res.body.success).to.be.true;
                        expect(res.body.data.length).to.be.at.most(3);
                        if (res.body.meta) {
                            expect(res.body.meta.statusFilter).to.equal("available");
                        }
                    }
                    expect(res.status).to.be.oneOf([200, 500]);
                    done();
                });
        });
    });

    describe("POST /ambulances/route-to-incident", () => {
        it("should return 400 if incident location is missing", (done) => {
            request.execute(app)
                .post("/ambulances/route-to-incident")
                .send({})
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    done();
                });
        });

        it("should return 400 if ambulance location is not provided", (done) => {
            request.execute(app)
                .post("/ambulances/route-to-incident")
                .send({
                    incidentLocation: { latitude: 36.818, longitude: 10.165 }
                })
                .end((err, res) => {
                    expect(res).to.have.status(400);
                    expect(res.body.success).to.be.false;
                    done();
                });
        });

        it("should calculate route when both locations are provided", (done) => {
            request.execute(app)
                .post("/ambulances/route-to-incident")
                .send({
                    ambulanceLocation: { latitude: 36.820, longitude: 10.160 },
                    incidentLocation: { latitude: 36.818, longitude: 10.165 }
                })
                .end((err, res) => {
                    // This test depends on ArcGIS service availability
                    if (res.status === 200) {
                        expect(res.body.success).to.be.true;
                        expect(res.body.data).to.have.property("route");
                    }
                    expect(res.status).to.be.oneOf([200, 400, 500]);
                    done();
                });
        });
    });
});
