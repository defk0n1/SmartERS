import * as chai from "chai";
import chaiHttp from "chai-http";
import app from "../app.js";

chai.use(chaiHttp);
import { request } from 'chai-http';
const { expect } = chai;

describe("Incidents API", () => {
    let createdIncidentId;

    it("should return health check", (done) => {
        request.execute(app)
            .get("/health")
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.status).to.equal("GIS backend running");
                done();
            });
    });

    it("should create a new incident", (done) => {
        const incident = {
            attributes: {
                description: "Test incident",
                severity: "high",
                status: "pending",
                reportedBy: "testUser123"
            },
            geometry: { x: -73.985, y: 40.748 }
        };

        request.execute(app)
            .post("/incidents")
            .send(incident)
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.addResults).to.be.an("array");
                expect(res.body.addResults[0].success).to.be.true;
                createdIncidentId = res.body.addResults[0].objectId;
                done();
            });
    });

    it("should get all incidents", (done) => {
        request.execute(app)
            .get("/incidents")
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body).to.be.an("array");
                done();
            });
    });

    it("should update an incident", (done) => {
        const updateFeature = [
            {
                attributes: {
                    objectId: createdIncidentId,
                    status: "assigned"
                }
            }
        ];

        request.execute(app)
            .put("/incidents")
            .send({ features: updateFeature })
            .end((err, res) => {
                expect(res).to.have.status(200);
                expect(res.body.updateResults[0].success).to.be.true;
                done();
            });
    });
});