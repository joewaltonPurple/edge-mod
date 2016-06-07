define([
    "knockout",
    "d3",
    "jquery",
    "common/topic",
    "./topics",
    "./Graph"
], function (ko, d3, $, topic, topics) {
    "use strict";

    function noPlusButton(hasBacklinks, hasMatches, isBackLinkShown, isMatchesShown) {
        return ((!hasBacklinks) && (!hasMatches)
        || (isBackLinkShown && isMatchesShown)
        || (hasMatches && isMatchesShown && !(hasBacklinks))
        || (hasBacklinks && isBackLinkShown && (!hasMatches)))
    }

    function needsResize(newWidth, newHeight, currentWidth, currentHeight) {
        return newWidth > 0
            && newHeight > 0
            && newWidth !== currentWidth
            && newHeight !== currentHeight;
    }

    function sizeToParent(element, graphModel) {
        var parent = $(element.parentNode);
        var height = parent.height();
        var width = parent.width();
        var currentSize = graphModel.size();
        if (needsResize(width, height, currentSize[0], currentSize[1])) {
            d3.select(element).attr("viewBox", "0 0 " + width + " " + height)
            graphModel.size([width, height]);
        }
    }

    ko.bindingHandlers.forceGraph = {
        nodeClass: "ko-d3-graph-node",
        linkClass: "ko-d3-graph-link",
        init: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            if (!(element.tagName === "svg")) {
                throw new Error("The 'forceGraph' binding can only be applied to 'svg' elements.");
            }

            var graphModel = valueAccessor()();
            var rootId = graphModel.findRootNode().id();
            ko.bindingHandlers["with"].init(element, valueAccessor, allBindings, viewModel, bindingContext);
            graphModel.applyBindingValues(allBindings());

            d3.select(window).on("resize", function () {
                sizeToParent(element, graphModel);
            });
            var handle = topic.subscribe(topics.RESIZE, function (id) {
                if (id === rootId) {
                    sizeToParent(element, graphModel);
                }
            });
            sizeToParent(element, graphModel);


            ko.utils.domNodeDisposal.addDisposeCallback(element, function () {
                handle.remove();
            });
            // Tell Knockout that we've already dealt with child bindings
            return {
                controlsDescendantBindings: true
            }
        },
        update: function (element, valueAccessor, allBindings, viewModel, bindingContext) {
            var graphModel = valueAccessor()();
            var container = d3.select(element);

            var currentScale = 1;
            var currentXOffset = 0;
            var currentYOffset = 0;

            var nodeSelected = null;
            var nodeSelectedX = null;
            var nodeSelectedY = null;

            var minZoom = 0.3;
            var maxZoom = 5;

            var parent = d3.select(element.parentElement);
            var tooltip = parent.select('#graph-node-tooltip');

            var zoom = d3.behavior.zoom()
                .scaleExtent([minZoom, maxZoom])
                .on("zoom", function (d, i) {
                    //Filter all but left mouse button
                    if (d3.event.sourceEvent === null || d3.event.sourceEvent.which !== 1
                        || d3.event.scale == currentScale) {
                        return;
                    }

                    currentScale = d3.event.scale;
                    graphModel.d3Layout().resume();
                });

            var drag = d3.behavior.drag()
                .on("drag", function (d) {
                    //Filter all but left mouse button
                    if (d3.event.sourceEvent === null || d3.event.sourceEvent.which !== 1) {
                        return;
                    }

                    if (nodeSelected !== null) {
                        updateDraggedNode(nodeSelected);
                    }
                    else {
                        currentXOffset = currentXOffset + d3.event.dx;
                        currentYOffset = currentYOffset + d3.event.dy;
                    }
                    graphModel.d3Layout().resume();
                })
                .on("dragend", function (d) {
                    nodeSelected = null;
                });

            var dragNode = d3.behavior.drag()
                .on("dragstart", function (d) {
                    graphModel.d3Layout().stop();
                    nodeSelected = d;
                });


            function updateDraggedNode(d) {
                nodeSelectedX = d.x = d.x + d3.event.dx / currentScale;
                nodeSelectedY = d.y = d.y + d3.event.dy / currentScale;
            }

            var nodeSelector = container
                .selectAll("." + ko.bindingHandlers.forceGraph.nodeClass)
                .data(graphModel.nodes()).call(dragNode);

            function createToggleButton(type, glyphicon, state, callback, id) {
            function createToggleButton(type, glyphicon, state, callback, id) {
                return "<button type=\"button\" class=\"btn btn-default clear_bg\" aria-label=\"Left Align\" data-bind=\"click:$data." + callback + ".bind($data,'" + id + "')\">"
                    + "<span class='" + type + " glyphicon glyphicon-" + glyphicon + (state ? " fa-signal " : " ") + "clear_bg'>"
                    + "</span>"
                    + "</button>";
            }

            function createButton(type, glyphicon, callback, id) {
                return "<button type=\"button\" class=\"btn btn-default clear_bg\" aria-label=\"Left Align\" data-bind=\"click:$data." + callback + ".bind($data,'" + id + "')\">"
                    + "<span class='" + type + " glyphicon glyphicon-" + glyphicon + " clear_bg'>"
                    + "</span>"
                    + "</button>";
            }

            function showMatchesButton(id, hasMatches, matchesShown) {
                return hasMatches ?
                    createToggleButton("match icon-rotated", "pause", matchesShown, (matchesShown ? "onMinusMatchesClicked" : "onPlusMatchesClicked"), id)
                    : "";
            }

            function showBacklinksButton(id, hasBacklinks, backlinksShown) {
                return hasBacklinks ?
                    createToggleButton("backlink", "arrow-left", backlinksShown, (backlinksShown ? "onMinusBacklinkClicked" : "onPlusBacklinkClicked"), id)
                    : "";
            }

            function showEdgesButton(id, hasEdges, edgesShown) {
                return hasEdges ?
                    createToggleButton("backlink", "eye-open", edgesShown, (edgesShown ? "onHideEdges" : "onShowEdges"), id)
                    : "";
            }

            function showPublishAndHomeButton(id, nodeType) {
                if (nodeType == 'draft') {
                    return "";
                }

                return createButton("", "home", "onNewRootId", id) + createButton("", "info-sign", "onExternalPublish", id);
            }

            var matchingAndBacklinks = container
                .selectAll("." + ko.bindingHandlers.forceGraph.nodeClass)
                .data(graphModel.nodes()).on("mousemove", function (d) {
                    var viewBox = container.node().viewBox;
                    var x_middle = (viewBox.animVal != null ? viewBox.animVal.width / 2 : 0);
                    var y_middle = (viewBox.animVal != null ? viewBox.animVal.height / 2 : 0);
                    var iWidth = (d.imageWidth() / 4) * currentScale;
                    var iHeight = (d.imageHeight() / 4) * currentScale;
                    if (d.nodeType() != 'broken') {
                        tooltip.transition()
                            .duration(200)
                            .style("opacity", 0.8);
                        tooltip.html("<div class=\"btn-group\" role=\"group\" aria-label=\"\">" +
                                showBacklinksButton(d.id(), d.hasBacklinks(), d.isBackLinkShown()) +
                                showMatchesButton(d.id(), d.hasMatches(), d.isMatchesShown()) +
                                showEdgesButton(d.id(), d.hasEdges(), d.isEdgesShown()) +
                                showPublishAndHomeButton(d.id(), d.nodeType()) +
                                "</div>"
                            )
                            .style("left", ((x_middle + iWidth + (d.x - x_middle) * currentScale) + currentXOffset) + "px")
                            .style("top", ((y_middle - iHeight + (d.y - y_middle) * currentScale) + currentYOffset) + "px");
                    }
                    else {
                        tooltip.transition()
                            .duration(10)
                            .style("opacity", 0.8);
                        tooltip.html(
                            "<button type=\"button\" class=\"btn btn-danger clear_bg\" data-toggle=\"dropdown\" aria-haspopup=\"true\" aria-expanded=\"false\">" +
                            "<span class='clear_bg'>Broken node</span>" +
                            "</button>"
                            )
                            .style("left", ((x_middle + iWidth + (d.x - x_middle) * currentScale) + currentXOffset) + "px")
                            .style("top", ((y_middle - iHeight + (d.y - y_middle) * currentScale) + currentYOffset) + "px");
                    }
                    ko.applyBindings(viewModel, tooltip.node().childNodes[0]);
                });

            container.on("mouseover", function (d) {
                tooltip.transition()
                    .duration(300)
                    .style("opacity", 0);
            });


            var showMatchingAndBacklinks = container
                .selectAll("." + ko.bindingHandlers.forceGraph.nodeClass);

            var linkSelector = container
                .selectAll("." + ko.bindingHandlers.forceGraph.linkClass)
                .data(graphModel.links());

            container.call(zoom).call(drag);
            graphModel
                .d3Layout()
                .on("tick", function () {
                    var viewBox = container.node().viewBox;
                    var x_middle = viewBox.animVal != null ? viewBox.animVal.width / 2 : 0;
                    var y_middle = viewBox.animVal != null ? viewBox.animVal.height / 2 : 0;

                    nodeSelector.attr("transform", function (d) {
                        if (d === nodeSelected) { //Without this, the dragged node jumps out double its dragged distance
                            d.x = nodeSelectedX;
                            d.y = nodeSelectedY;
                        }

                        return "translate(" + ((x_middle + (d.x - x_middle) * currentScale) + currentXOffset)
                            + "," + ((y_middle + (d.y - y_middle) * currentScale) + currentYOffset)
                            + ")scale(" + currentScale + ")";
                    });

                    linkSelector.attr("x1", function (d) {
                            return (x_middle + (d.source.x - x_middle) * currentScale) + currentXOffset;
                        })
                        .attr("y1", function (d) {
                            return (y_middle + (d.source.y - y_middle) * currentScale) + currentYOffset;
                        })
                        .attr("x2", function (d) {
                            return (x_middle + (d.target.x - x_middle) * currentScale) + currentXOffset;
                        })
                        .attr("y2", function (d) {
                            return (y_middle + (d.target.y - y_middle) * currentScale) + currentYOffset;
                        });
                })
        }
    };
});
