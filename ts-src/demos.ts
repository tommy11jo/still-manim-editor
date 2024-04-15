export const SIN_AND_COS_DEMO = `from smanim import *
n = NumberPlane.from_axes_ranges((-6, 6), (-2, 2), axis_config={"include_arrow_tips": False})
sin_graph_obj = n.plot(np.sin, color=RED)
derivative_fn = sin_graph_obj.gen_derivative_fn()
cos_graph_obj = n.plot(derivative_fn, color=BLUE)
sin_label = Text("y = sin(x)", color=RED, font_size=30).next_to(sin_graph_obj, UP)
sin_label.shift(RIGHT * 2)
cos_label = Text("y = cos(x)", color=BLUE, font_size=30).next_to(cos_graph_obj, UP)
cos_label.shift(LEFT * 0.6)
canvas.add(n, sin_label, cos_label)
canvas.draw()
`

export const DIJKSTRA_DEMO = `# Improve this to be like programcomics.com
from smanim import *
from typing import Hashable, Tuple
WEIGHTED_GRAPH1 = {
    0: [(1, 2), (2, 1)],
    1: [(2, 5), (3, 11), (4, 3)],
    2: [(5, 15)],
    3: [(4, 2)],
    4: [(2, 1), (5, 4), (6, 5)],
    5: [],
    6: [(3, 1), (5, 1)],
}
graph = WEIGHTED_GRAPH1
vertices, edges, edge_labels = WeightedGraph.from_adjacency_list(graph)
graph = WeightedGraph(
  vertices, 
  edges,
  edge_labels=edge_labels,
  edge_type=Arrow,
  vertex_config={"fill_color": GREEN, "fill_opacity": 0.4, "radius": 0.2},
  edge_config={"opacity": 0.5},
  layout_config={"seed": 2}
)
graph.add_vertex_labels()
graph.scale(1.5)
canvas.add(graph)


start = graph.vertices[0]
start.set_color(BLUE, family=False)
start_label = Text("start")
start_label.next_to(start, buff=SMALL_BUFF)
canvas.add(start_label)

graph.vertices[2].set_color(BLUE, family=False)
two_dist = Text("1", color=RED).next_to(graph.vertices[2], LEFT, buff=SMALL_BUFF)
five_dist = Text("16", color=RED).next_to(graph.vertices[5], LEFT, buff=SMALL_BUFF)
canvas.add(two_dist, five_dist)

visited_edges = Group(graph.edges[(0, 2)], graph.edges[(0, 1)])
visited_edges.set_color(GREEN)
visited_edges.set_opacity(0.4)

cur_node = graph.vertices[1].set_color(RED, family=False).set_opacity(1.0, family=False)
relaxed_edges = Group(graph.edges[(1, 2)], graph.edges[(1, 4)], graph.edges[(1, 3)])
relaxed_edges.set_color(RED).set_opacity(1.0)
relaxed_edges[0].set_opacity(0.5)

four_dist = Text("5", color=RED).next_to(graph.vertices[4], UP, buff=SMALL_BUFF)
four_dist.add_surrounding_rect(stroke_color=RED)
canvas.add(four_dist)
three_dist = Text("13", color=RED).next_to(graph.vertices[3], UP, buff=SMALL_BUFF)
three_dist.add_surrounding_rect(stroke_color=RED)
canvas.add(three_dist)

title = Text("Relaxing Edges in Dijkstra's", font_size=H1_FONT_SIZE)
title.next_to(graph, UP).shift(UP * 0.2 + RIGHT * 0.4)
canvas.add(title)

desc = Group()
blue_dot = Dot(fill_color=BLUE, fill_opacity=0.4)
legend = Text("Legend").next_to(graph, buff=0.6)
blue_dot.next_to(legend, DOWN).align_to(legend, LEFT)
blue_text = Text("Already visited").next_to(blue_dot)
red_dot = Dot(fill_color=RED).next_to(blue_dot, DOWN)
red_text = Text("Currently visiting").next_to(red_dot)
desc.add(legend, blue_dot, blue_text, red_dot, red_text)
canvas.add(desc)

canvas.draw(crop=True)
`

export const LEMON_DEMO = `from smanim import *
stroke_width = 1
lemon = VGroup()
c = Circle(fill_color=YELLOW_D, stroke_color=WHITE, stroke_width=stroke_width)
c.stretch(1.4, dim=0).rotate(PI / 8)
arc = Arc(
    angle=-PI, fill_color=YELLOW_E, stroke_color=WHITE, stroke_width=stroke_width
)
arc.stretch(2, dim=1)
arc.stretch(1.4, dim=0).rotate(PI / 8)
lemon.add(c, arc)
lemon.bring_to_front(c)

spikes = VGroup()
for prop in range(8):
    vector = Vector(c.point_from_proportion(prop / 8))
    spikes.add(vector)
lemon.add(spikes)

other_lemon: VGroup = lemon.copy()
other_lemon.scale(0.8).shift(RIGHT * 0.5).rotate(-PI / 4)
lemon.shift(LEFT * 0.5)
other_lemon.shift(RIGHT * 0.8)
other_lemon.set_z_index(-10)

lemons = VGroup(lemon, other_lemon)
title = Text("Still Manim", font_size=H1_FONT_SIZE)
lemons.scale_to_fit_height(title.height)
title.next_to(lemons, buff=0.05)
canvas.add(lemons, title)

canvas.draw(crop=True)
`
